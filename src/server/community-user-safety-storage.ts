import "server-only";

import type { Firestore, Query } from "firebase-admin/firestore";
import type { CommunityMutation } from "@/domain/community";
import { assertAccountDeletionUnlockedInTransaction } from "./account-deletion-lock";
import { reconcileCommunityCounters } from "./community-counter-storage";
import {
  communityAppealSchema,
  communityBlockSchema,
  communityCommentRecordSchema,
  communityModerationActionRecordSchema,
  communityReportRecordSchema,
  communityStoredProjectionSchema,
} from "@/domain/community-safety";
import {
  COMMUNITY_COLLECTIONS,
  communityDigest,
  createCommunityAuditRecord,
  type CommunityActor,
} from "./community-records";
import { CommunityMutationError } from "./community-projection-storage";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "./firebase-admin";

export type CommunityDeleteResult = {
  blocksDeleted: number;
  commentsDeleted: number;
  consentsDeleted: number;
  interactionsDeleted: number;
  notificationsDeleted: number;
  postsDeleted: number;
  reportsDeleted: number;
};

export class CommunityDeletionIncompleteError extends Error {
  constructor(readonly result: CommunityDeleteResult, readonly failures: string[]) {
    super("Community deletion did not reach a terminal state.");
    this.name = "CommunityDeletionIncompleteError";
  }
}

export async function getCommunityAccountRiskState(userId: string) {
  const db = await getFirebaseAdminFirestore();
  const snapshot = await db.collection(COMMUNITY_COLLECTIONS.accountModeration).doc(userId).get();
  const state = snapshot.exists ? String(snapshot.data()?.state ?? "clear") : "clear";
  return state === "restricted" || state === "banned" ? state : "clear";
}

export async function setCommunityBlock(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "block" | "unblock" }>, now = new Date()) {
  if (actor.uid === mutation.accountId) throw new CommunityMutationError("You cannot block your own account.", 400);
  const db = await getFirebaseAdminFirestore();
  const id = communityDigest(actor.uid, mutation.accountId);
  const reference = db.collection(COMMUNITY_COLLECTIONS.blocks).doc(id);
  const audit = requireAudit(mutation.action, actor.uid, now, mutation.accountId, "account");
  if (mutation.action === "block") {
    const block = communityBlockSchema.parse({
      schemaVersion: 1,
      id,
      blockerId: actor.uid,
      blockedId: mutation.accountId,
      createdAt: now.toISOString(),
    });
    await db.runTransaction(async (transaction) => {
      await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
      transaction.set(reference, block);
      transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
    });
  } else {
    await db.runTransaction(async (transaction) => {
      await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
      transaction.delete(reference);
      transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
    });
  }
  return { blocked: mutation.action === "block" };
}

export async function reportCommunityTarget(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "report" }>, now = new Date()) {
  if (mutation.targetType === "account" && mutation.targetId === actor.uid) {
    throw new CommunityMutationError("You cannot report your own account.", 400);
  }
  const db = await getFirebaseAdminFirestore();
  const accountRevision = mutation.targetType === "account"
    ? await getAccountReportRevision(mutation.targetId, now)
    : null;

  return db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
    const target = mutation.targetType === "post"
      ? await transaction.get(db.collection(COMMUNITY_COLLECTIONS.projections).doc(mutation.targetId))
      : mutation.targetType === "comment"
        ? await transaction.get(db.collection(COMMUNITY_COLLECTIONS.comments).doc(mutation.targetId))
        : null;
    const revision = target
      ? getContentReportRevision(mutation.targetType === "post" ? "post" : "comment", target.data(), actor.uid)
      : accountRevision!;
    const id = communityDigest(actor.uid, mutation.targetType, mutation.targetId, revision);
    const reference = db.collection(COMMUNITY_COLLECTIONS.reports).doc(id);
    const existing = await transaction.get(reference);
    if (existing.exists) return { id, duplicate: true };
    const audit = requireAudit("report", actor.uid, now, mutation.targetId, mutation.targetType);
    const report = communityReportRecordSchema.parse({
      schemaVersion: 1,
      id,
      reporterId: actor.uid,
      targetType: mutation.targetType,
      targetId: mutation.targetId,
      reason: mutation.reason,
      ...(mutation.details ? { details: mutation.details } : {}),
      deduplicationKey: id,
      status: "queued",
      resolutionActionId: null,
      resolverId: null,
      queueEnteredAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    transaction.create(reference, report);
    if (mutation.targetType === "post") transaction.update(target!.ref, { moderationState: "reported", updatedAt: now.toISOString() });
    if (mutation.targetType === "comment") transaction.update(target!.ref, { moderationState: "reported", updatedAt: now.toISOString() });
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
    return { id, duplicate: false };
  });
}

function getContentReportRevision(targetType: "post" | "comment", value: unknown, reporterId: string) {
  if (targetType === "post") {
    const projection = communityStoredProjectionSchema.safeParse(value);
    if (!projection.success || projection.data.visibility !== "public" || projection.data.moderationState === "removed") {
      throw new CommunityMutationError("The reported item is no longer available.", 404);
    }
    if (projection.data.ownerId === reporterId) throw new CommunityMutationError("You cannot report your own content.", 400);
    return communityDigest(
      projection.data.title,
      projection.data.note ?? "",
      projection.data.category,
      projection.data.critiqueExcerpt,
    );
  }
  const comment = communityCommentRecordSchema.safeParse(value);
  if (!comment.success || comment.data.status !== "visible" || comment.data.moderationState === "removed") {
    throw new CommunityMutationError("The reported item is no longer available.", 404);
  }
  if (comment.data.authorId === reporterId) throw new CommunityMutationError("You cannot report your own content.", 400);
  return communityDigest(comment.data.body, comment.data.createdAt);
}

async function getAccountReportRevision(accountId: string, now: Date) {
  try {
    await (await getFirebaseAdminAuth()).getUser(accountId);
  } catch {
    throw new CommunityMutationError("The reported item is no longer available.", 404);
  }
  return now.toISOString().slice(0, 10);
}

export async function submitCommunityAppeal(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "appeal" }>, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const actionReference = db.collection(COMMUNITY_COLLECTIONS.moderationActions).doc(mutation.actionId);
  const appealId = communityDigest("appeal", mutation.actionId);
  const appealReference = db.collection(COMMUNITY_COLLECTIONS.appeals).doc(appealId);
  const audit = requireAudit("appeal-submit", actor.uid, now, appealId, "appeal");
  return db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
    const actionSnapshot = await transaction.get(actionReference);
    const action = communityModerationActionRecordSchema.safeParse(actionSnapshot.data());
    if (!action.success || !["remove", "restrict", "ban"].includes(action.data.action)) {
      throw new CommunityMutationError("This moderation action cannot be appealed.", 404);
    }
    const targetReference = action.data.targetType === "post"
      ? db.collection(COMMUNITY_COLLECTIONS.projections).doc(action.data.targetId)
      : action.data.targetType === "comment"
        ? db.collection(COMMUNITY_COLLECTIONS.comments).doc(action.data.targetId)
        : null;
    const targetSnapshot = targetReference ? await transaction.get(targetReference) : null;
    const ownsTarget = action.data.targetType === "account"
      ? action.data.targetId === actor.uid
      : action.data.targetType === "post"
        ? communityStoredProjectionSchema.safeParse(targetSnapshot?.data()).data?.ownerId === actor.uid
        : communityCommentRecordSchema.safeParse(targetSnapshot?.data()).data?.authorId === actor.uid;
    if (!ownsTarget) throw new CommunityMutationError("This moderation action cannot be appealed.", 404);
    if ((await transaction.get(appealReference)).exists) throw new CommunityMutationError("This moderation action already has an appeal.", 409);
    const appeal = communityAppealSchema.parse({
      schemaVersion: 1,
      id: appealId,
      actionId: mutation.actionId,
      appellantId: actor.uid,
      reason: mutation.reason,
      status: "queued",
      originalModeratorId: action.data.moderatorId,
      reviewerId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    transaction.create(appealReference, appeal);
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
    return { id: appealId };
  });
}

export async function deleteCommunityDataForUser(userId: string): Promise<CommunityDeleteResult> {
  const db = await getFirebaseAdminFirestore();
  const result: CommunityDeleteResult = {
    blocksDeleted: 0,
    commentsDeleted: 0,
    consentsDeleted: 0,
    interactionsDeleted: 0,
    notificationsDeleted: 0,
    postsDeleted: 0,
    reportsDeleted: 0,
  };
  const failures: string[] = [];
  const ownedPosts = await db.collection(COMMUNITY_COLLECTIONS.projections).where("ownerId", "==", userId).get();
  const ownedPostIds = ownedPosts.docs.map((document) => String(document.data().postId ?? document.id));
  const authoredComments = await db.collection(COMMUNITY_COLLECTIONS.comments).where("authorId", "==", userId).get();
  const ownedInteractions = await db.collection(COMMUNITY_COLLECTIONS.interactions).where("userId", "==", userId).get();
  const ownedPostIdSet = new Set(ownedPostIds);
  const affectedCounterPostIds = new Set<string>();
  for (const comment of authoredComments.docs) {
    const value = comment.data();
    if (value.status === "visible" && typeof value.postId === "string" && !ownedPostIdSet.has(value.postId)) {
      affectedCounterPostIds.add(value.postId);
    }
  }
  for (const interaction of ownedInteractions.docs) {
    const value = interaction.data();
    if (value.active === true && ["liked", "saved"].includes(String(value.type)) && typeof value.postId === "string" && !ownedPostIdSet.has(value.postId)) {
      affectedCounterPostIds.add(value.postId);
    }
  }
  const commentsById = new Map(authoredComments.docs.map((document) => [document.id, document]));
  for (const postId of ownedPostIds) {
    const comments = await db.collection(COMMUNITY_COLLECTIONS.comments).where("postId", "==", postId).get();
    for (const comment of comments.docs) commentsById.set(comment.id, comment);
  }
  const deletedCommentIds = [...commentsById.keys()];
  const reportDocuments = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  const moderationActionDocuments = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  try {
    await addQueryDocuments(reportDocuments, db.collection(COMMUNITY_COLLECTIONS.reports).where("reporterId", "==", userId));
    await addQueryDocuments(reportDocuments, db.collection(COMMUNITY_COLLECTIONS.reports).where("targetType", "==", "account").where("targetId", "==", userId));
    await addQueryDocuments(moderationActionDocuments, db.collection(COMMUNITY_COLLECTIONS.moderationActions).where("targetType", "==", "account").where("targetId", "==", userId));
    for (const postId of ownedPostIds) {
      await addQueryDocuments(reportDocuments, db.collection(COMMUNITY_COLLECTIONS.reports).where("targetType", "==", "post").where("targetId", "==", postId));
      await addQueryDocuments(moderationActionDocuments, db.collection(COMMUNITY_COLLECTIONS.moderationActions).where("targetType", "==", "post").where("targetId", "==", postId));
    }
    for (const commentId of deletedCommentIds) {
      await addQueryDocuments(reportDocuments, db.collection(COMMUNITY_COLLECTIONS.reports).where("targetType", "==", "comment").where("targetId", "==", commentId));
      await addQueryDocuments(moderationActionDocuments, db.collection(COMMUNITY_COLLECTIONS.moderationActions).where("targetType", "==", "comment").where("targetId", "==", commentId));
    }
  } catch {
    throw new CommunityDeletionIncompleteError(result, ["discover-derivatives"]);
  }
  try {
    await updateInBatches(db, ownedPosts.docs.map((document) => ({ reference: document.ref, data: { visibility: "hidden", updatedAt: new Date().toISOString() } })));
  } catch {
    failures.push("hide-owned-projections");
  }

  await collectDeletion("interactionsDeleted", async () => {
    await deleteReferences(db, ownedInteractions.docs.map((document) => document.ref));
    const own = ownedInteractions.size;
    let derivatives = 0;
    for (const postId of ownedPostIds) derivatives += await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.interactions).where("postId", "==", postId));
    return own + derivatives;
  });
  await collectDeletion("consentsDeleted", () => deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.consents).where("userId", "==", userId)));
  await collectDeletion("reportsDeleted", async () => {
    for (const reportId of reportDocuments.keys()) {
      await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.outbox).where("targetId", "==", reportId));
    }
    await deleteReferences(db, [...reportDocuments.values()].map((document) => document.ref));
    return reportDocuments.size;
  });
  await collectDeletion("blocksDeleted", async () => (
    await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.blocks).where("blockerId", "==", userId))
    + await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.blocks).where("blockedId", "==", userId))
  ));
  await collectDeletion("notificationsDeleted", async () => {
    let count = await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.notifications).where("userId", "==", userId))
      + await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.notifications).where("actorId", "==", userId));
    for (const postId of ownedPostIds) {
      count += await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.notifications).where("postId", "==", postId));
    }
    return count;
  });
  await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.appeals).where("appellantId", "==", userId))
    .catch(() => failures.push("appeals"));
  for (const actionId of moderationActionDocuments.keys()) {
    await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.appeals).where("actionId", "==", actionId))
      .catch(() => failures.push(`action-appeals:${actionId}`));
  }
  for (const postId of ownedPostIds) {
    await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.outbox).where("targetId", "==", postId))
      .catch(() => failures.push(`outbox:${postId}`));
  }
  for (const commentId of deletedCommentIds) {
    await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.outbox).where("targetId", "==", commentId))
      .catch(() => failures.push(`comment-outbox:${commentId}`));
  }
  await deleteReferences(db, [...moderationActionDocuments.values()].map((document) => document.ref))
    .catch(() => failures.push("moderation-actions"));
  await db.collection(COMMUNITY_COLLECTIONS.accountModeration).doc(userId).delete()
    .catch(() => failures.push("account-moderation"));
  for (const postId of ownedPostIds) {
    await deleteQuery(db, db.collection(COMMUNITY_COLLECTIONS.counterShards).where("postId", "==", postId)).catch(() => failures.push(`counter-shards:${postId}`));
  }
  if (failures.length > 0) throw new CommunityDeletionIncompleteError(result, failures);

  try {
    await deleteReferences(db, [...commentsById.values()].map((document) => document.ref));
    result.commentsDeleted = commentsById.size;
  } catch {
    failures.push("commentsDeleted");
  }
  if (failures.length > 0) throw new CommunityDeletionIncompleteError(result, failures);

  for (const postId of affectedCounterPostIds) {
    await reconcileCommunityCounters({ postId }).catch(() => failures.push(`counter-reconcile:${postId}`));
  }
  if (failures.length > 0) throw new CommunityDeletionIncompleteError(result, failures);

  try {
    await deleteReferences(db, ownedPosts.docs.map((document) => document.ref));
    result.postsDeleted = ownedPosts.size;
  } catch {
    failures.push("owned-projections");
  }
  if (failures.length > 0) throw new CommunityDeletionIncompleteError(result, failures);
  return result;

  async function collectDeletion(key: keyof Omit<CommunityDeleteResult, "postsDeleted">, operation: () => Promise<number>) {
    try {
      result[key] = await operation();
    } catch {
      failures.push(key);
    }
  }
}

async function addQueryDocuments(
  documents: Map<string, FirebaseFirestore.QueryDocumentSnapshot>,
  query: Query,
) {
  const snapshot = await query.get();
  for (const document of snapshot.docs) documents.set(document.id, document);
}

async function deleteQuery(db: Firestore, query: Query) {
  let deleted = 0;
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) return deleted;
    await deleteReferences(db, snapshot.docs.map((document) => document.ref));
    deleted += snapshot.size;
    if (snapshot.size < 400) return deleted;
  }
}

async function deleteReferences(db: Firestore, references: FirebaseFirestore.DocumentReference[]) {
  for (let offset = 0; offset < references.length; offset += 400) {
    const batch = db.batch();
    for (const reference of references.slice(offset, offset + 400)) batch.delete(reference);
    await batch.commit();
  }
}

async function updateInBatches(db: Firestore, updates: Array<{ reference: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }>) {
  for (let offset = 0; offset < updates.length; offset += 400) {
    const batch = db.batch();
    for (const update of updates.slice(offset, offset + 400)) batch.update(update.reference, update.data);
    await batch.commit();
  }
}

function requireAudit(action: string, actorId: string, now: Date, targetId: string, targetType: "post" | "comment" | "account" | "appeal") {
  const audit = createCommunityAuditRecord({ action, actorId, actorRole: "user", now, reasonCode: action, targetId, targetType });
  if (!audit) throw new CommunityMutationError("Community audit storage is not configured.", 503);
  return audit;
}
