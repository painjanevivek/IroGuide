import "server-only";

import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import type { CommunityMutation } from "@/domain/community";
import {
  communityCommentRecordSchema,
  communityConsentSchema,
  communityInteractionRecordSchema,
  communityProjectionViewSchema,
  communityPublicCommentSchema,
  communityStoredProjectionSchema,
} from "@/domain/community-safety";
import { reviewOutputSchema } from "@/domain/review";
import { getReviewTrustState, trustedReviewProvenanceSchema } from "@/domain/review-storage";
import { incrementCommunityCounter } from "./community-counter-storage";
import { assertAccountDeletionUnlockedInTransaction } from "./account-deletion-lock";
import {
  COMMUNITY_COLLECTIONS,
  communityDigest,
  createCommunityAuditRecord,
  createCommunityOutboxRecord,
  getCommunityAuthor,
  getDefaultCommunityTitle,
  toCommunityPublicProjection,
  type CommunityActor,
} from "./community-records";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const storedCommunityReviewSchema = z.object({
  userId: z.string().min(1),
  categoryLabel: z.string().min(1).max(80),
  status: z.literal("complete"),
  provider: reviewOutputSchema.shape.provider,
  provenance: trustedReviewProvenanceSchema.optional(),
  review: reviewOutputSchema,
}).refine((document) => document.provider === document.review.provider, {
  message: "Stored provider must match the normalized review provider.",
  path: ["provider"],
});

export class CommunityMutationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "CommunityMutationError";
  }
}

export async function listCommunityProjections(userId?: string) {
  const db = await getFirebaseAdminFirestore();
  const [projections, blockedIds, interactions] = await Promise.all([
    db.collection(COMMUNITY_COLLECTIONS.projections).where("visibility", "==", "public").limit(40).get(),
    userId ? getBidirectionalBlockedIds(userId) : Promise.resolve(new Set<string>()),
    userId
      ? db.collection(COMMUNITY_COLLECTIONS.interactions).where("userId", "==", userId).where("active", "==", true).limit(120).get()
      : Promise.resolve({ docs: [] }),
  ]);
  const viewerInteractions = new Map<string, Set<string>>();
  for (const document of interactions.docs) {
    const parsed = communityInteractionRecordSchema.safeParse(document.data());
    if (!parsed.success) continue;
    const types = viewerInteractions.get(parsed.data.postId) ?? new Set<string>();
    types.add(parsed.data.type);
    viewerInteractions.set(parsed.data.postId, types);
  }
  return projections.docs
    .map((document) => communityStoredProjectionSchema.safeParse(document.data()))
    .flatMap((result) => result.success && result.data.consent.withdrawalState === "active" ? [result.data] : [])
    .filter((projection) => !blockedIds.has(projection.ownerId))
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .map((projection) => {
      const types = viewerInteractions.get(projection.postId) ?? new Set<string>();
      return communityProjectionViewSchema.parse({
        projection: toCommunityPublicProjection(projection),
        viewer: {
          liked: types.has("liked"),
          owned: projection.ownerId === userId,
          saved: types.has("saved"),
          shared: types.has("shared"),
        },
      });
    });
}

export async function listCommunityComments(postId: string, userId: string) {
  const db = await getFirebaseAdminFirestore();
  const projection = parseVisibleProjection((await db.collection(COMMUNITY_COLLECTIONS.projections).doc(postId).get()).data());
  const blockedIds = await getBidirectionalBlockedIds(userId);
  if (blockedIds.has(projection.ownerId)) throw new CommunityMutationError("This community post is no longer available.", 404);
  const comments = await db.collection(COMMUNITY_COLLECTIONS.comments).where("postId", "==", postId).limit(200).get();
  return comments.docs.flatMap((document) => {
    const parsed = communityCommentRecordSchema.safeParse(document.data());
    if (!parsed.success || parsed.data.status !== "visible" || blockedIds.has(parsed.data.authorId)) return [];
    return [communityPublicCommentSchema.parse({
      id: parsed.data.id,
      postId: parsed.data.postId,
      authorName: parsed.data.authorName,
      body: parsed.data.body,
      createdAt: parsed.data.createdAt,
    })];
  }).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function publishCommunityProjection(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "publish" }>, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const reviewReference = db.collection("reviews").doc(mutation.reviewId);
  const postId = randomUUID();
  const projectionReference = db.collection(COMMUNITY_COLLECTIONS.projections).doc(postId);
  const consentId = communityDigest(actor.uid, mutation.reviewId, postId);
  const consentReference = db.collection(COMMUNITY_COLLECTIONS.consents).doc(consentId);
  const audit = requireAudit("publish", actor.uid, "user", now, "explicit-consent", postId, "post");
  const publishedAt = now.toISOString();

  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
    const reviewSnapshot = await transaction.get(reviewReference);
    const reviewDocument = reviewSnapshot.exists ? storedCommunityReviewSchema.safeParse(reviewSnapshot.data()) : null;
    if (!reviewDocument?.success || reviewDocument.data.userId !== actor.uid) {
      throw new CommunityMutationError("The selected critique is no longer available.", 404);
    }
    if (getReviewTrustState(reviewDocument.data) !== "server-verified") {
      throw new CommunityMutationError("This private critique is unverified. Rerun it before publishing to Community.", 409);
    }
    const review = reviewDocument.data;
    const projection = communityStoredProjectionSchema.parse({
      schemaVersion: 1,
      postId,
      ownerId: actor.uid,
      sourceReviewId: mutation.reviewId,
      publicAuthor: getCommunityAuthor(actor),
      title: mutation.title ?? getDefaultCommunityTitle(review.review.summary),
      ...(mutation.note ? { note: mutation.note } : {}),
      category: review.categoryLabel,
      critiqueExcerpt: review.review.summary.trim().slice(0, 600),
      visibility: "public",
      moderationState: "clear",
      moderationActionId: null,
      stats: { comments: 0, likes: 0, saves: 0 },
      publishedAt,
      consent: { version: mutation.consentVersion, grantedAt: publishedAt, withdrawalState: "active" },
      updatedAt: publishedAt,
    });
    const consent = communityConsentSchema.parse({
      schemaVersion: 1,
      id: consentId,
      userId: actor.uid,
      sourceReviewId: mutation.reviewId,
      projectionId: postId,
      consentVersion: mutation.consentVersion,
      state: "active",
      grantedAt: publishedAt,
      withdrawnAt: null,
      derivativeState: "active",
      updatedAt: publishedAt,
    });
    transaction.create(projectionReference, projection);
    transaction.create(consentReference, consent);
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
  });
  return { id: postId };
}

export async function editCommunityProjection(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "edit-post" }>, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(COMMUNITY_COLLECTIONS.projections).doc(mutation.postId);
  const audit = requireAudit("edit-post", actor.uid, "user", now, "author-edit", mutation.postId, "post");
  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
    const projection = parseOwnedProjection((await transaction.get(reference)).data(), actor.uid);
    if (projection.visibility === "deleted") throw new CommunityMutationError("This community post is no longer available.", 404);
    transaction.update(reference, {
      title: mutation.title,
      ...(mutation.note === undefined ? {} : { note: mutation.note || FieldValue.delete() }),
      updatedAt: now.toISOString(),
    });
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
  });
  return { updated: true };
}

export async function hideCommunityProjection(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "delete-post" | "withdraw-consent" }>, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const projectionReference = db.collection(COMMUNITY_COLLECTIONS.projections).doc(mutation.postId);
  const event = createCommunityOutboxRecord("delete-derivatives", mutation.postId, now);
  const audit = requireAudit(mutation.action, actor.uid, "user", now, mutation.action, mutation.postId, "post");
  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
    const projection = parseOwnedProjection((await transaction.get(projectionReference)).data(), actor.uid);
    const consentReference = db.collection(COMMUNITY_COLLECTIONS.consents)
      .doc(communityDigest(actor.uid, projection.sourceReviewId, mutation.postId));
    const consentSnapshot = await transaction.get(consentReference);
    transaction.update(projectionReference, {
      visibility: mutation.action === "delete-post" ? "deleted" : "hidden",
      consent: { ...projection.consent, withdrawalState: "active" },
      updatedAt: now.toISOString(),
    });
    if (consentSnapshot.exists) transaction.update(consentReference, {
      state: "withdrawn",
      withdrawnAt: now.toISOString(),
      derivativeState: "deletion-pending",
      updatedAt: now.toISOString(),
    });
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.outbox).doc(event.id), event);
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
  });
  return { hidden: true, deletionQueued: true };
}

export async function createCommunityComment(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "comment" }>, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const id = randomUUID();
  const projectionReference = db.collection(COMMUNITY_COLLECTIONS.projections).doc(mutation.postId);
  const commentReference = db.collection(COMMUNITY_COLLECTIONS.comments).doc(id);
  const audit = requireAudit("comment", actor.uid, "user", now, "author-comment", id, "comment");
  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
    const projectionSnapshot = await transaction.get(projectionReference);
    const projection = parseVisibleProjection(projectionSnapshot.data());
    const [outboundBlock, inboundBlock] = await Promise.all([
      transaction.get(db.collection(COMMUNITY_COLLECTIONS.blocks).doc(communityDigest(actor.uid, projection.ownerId))),
      transaction.get(db.collection(COMMUNITY_COLLECTIONS.blocks).doc(communityDigest(projection.ownerId, actor.uid))),
    ]);
    if (outboundBlock.exists || inboundBlock.exists) throw new CommunityMutationError("This community post is no longer available.", 404);
    const comment = communityCommentRecordSchema.parse({
      schemaVersion: 1,
      id,
      postId: mutation.postId,
      authorId: actor.uid,
      authorName: getCommunityAuthor(actor).displayName,
      authorDeletedAt: null,
      body: mutation.body,
      status: "visible",
      moderationState: "clear",
      moderationActionId: null,
      cursorKey: `${now.toISOString()}.${id}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    transaction.create(commentReference, comment);
    incrementCommunityCounter({ db, delta: 1, metric: "comments", now, postId: mutation.postId, shardKey: id, transaction });
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
  });
  return { id };
}

export async function deleteCommunityComment(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "delete-comment" }>, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(COMMUNITY_COLLECTIONS.comments).doc(mutation.commentId);
  const audit = requireAudit("delete-comment", actor.uid, "user", now, "author-delete", mutation.commentId, "comment");
  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
    const parsed = communityCommentRecordSchema.safeParse((await transaction.get(reference)).data());
    if (!parsed.success || parsed.data.authorId !== actor.uid || parsed.data.postId !== mutation.postId) {
      throw new CommunityMutationError("This community comment is no longer available.", 404);
    }
    if (parsed.data.status === "deleted") return;
    transaction.update(reference, {
      status: "deleted",
      authorDeletedAt: now.toISOString(),
      body: "Deleted by author",
      moderationState: "clear",
      moderationActionId: null,
      updatedAt: now.toISOString(),
    });
    if (parsed.data.status === "visible") {
      incrementCommunityCounter({ db, delta: -1, metric: "comments", now, postId: mutation.postId, shardKey: mutation.commentId, transaction });
    }
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
  });
  return { deleted: true };
}

export async function setCommunityInteraction(actor: CommunityActor, mutation: Extract<CommunityMutation, { action: "interaction" }>, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const type = mutation.key;
  const id = communityDigest(actor.uid, mutation.postId, type);
  const projectionReference = db.collection(COMMUNITY_COLLECTIONS.projections).doc(mutation.postId);
  const interactionReference = db.collection(COMMUNITY_COLLECTIONS.interactions).doc(id);
  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: actor.uid });
    const [projectionSnapshot, interactionSnapshot] = await Promise.all([
      transaction.get(projectionReference),
      transaction.get(interactionReference),
    ]);
    const projection = parseVisibleProjection(projectionSnapshot.data());
    const [outboundBlock, inboundBlock] = await Promise.all([
      transaction.get(db.collection(COMMUNITY_COLLECTIONS.blocks).doc(communityDigest(actor.uid, projection.ownerId))),
      transaction.get(db.collection(COMMUNITY_COLLECTIONS.blocks).doc(communityDigest(projection.ownerId, actor.uid))),
    ]);
    if (outboundBlock.exists || inboundBlock.exists) throw new CommunityMutationError("This community post is no longer available.", 404);
    const current = interactionSnapshot.exists
      ? communityInteractionRecordSchema.parse(interactionSnapshot.data())
      : null;
    if ((current?.active ?? false) === mutation.value) return;
    const interaction = communityInteractionRecordSchema.parse({
      schemaVersion: 1,
      id,
      postId: mutation.postId,
      userId: actor.uid,
      type,
      active: mutation.value,
      updatedAt: now.toISOString(),
    });
    transaction.set(interactionReference, interaction);
    const metric = type === "liked" ? "likes" : type === "saved" ? "saves" : null;
    if (metric) incrementCommunityCounter({ db, delta: mutation.value ? 1 : -1, metric, now, postId: mutation.postId, shardKey: id, transaction });
  });
  return { active: mutation.value };
}

async function getBidirectionalBlockedIds(userId: string) {
  const db = await getFirebaseAdminFirestore();
  const [outbound, inbound] = await Promise.all([
    db.collection(COMMUNITY_COLLECTIONS.blocks).where("blockerId", "==", userId).get(),
    db.collection(COMMUNITY_COLLECTIONS.blocks).where("blockedId", "==", userId).get(),
  ]);
  return new Set([
    ...outbound.docs.map((document) => String(document.data().blockedId)),
    ...inbound.docs.map((document) => String(document.data().blockerId)),
  ]);
}

function parseOwnedProjection(value: unknown, userId: string) {
  const parsed = communityStoredProjectionSchema.safeParse(value);
  if (!parsed.success || parsed.data.ownerId !== userId) throw new CommunityMutationError("This community post is no longer available.", 404);
  return parsed.data;
}

function parseVisibleProjection(value: unknown) {
  const parsed = communityStoredProjectionSchema.safeParse(value);
  if (!parsed.success || parsed.data.visibility !== "public" || parsed.data.moderationState === "removed") {
    throw new CommunityMutationError("This community post is no longer available.", 404);
  }
  return parsed.data;
}

function requireAudit(action: string, actorId: string, actorRole: "user" | "moderator" | "system", now: Date, reasonCode: string, targetId: string, targetType: "post" | "comment" | "account" | "report" | "appeal") {
  const audit = createCommunityAuditRecord({ action, actorId, actorRole, now, reasonCode, targetId, targetType });
  if (!audit) throw new CommunityMutationError("Community audit storage is not configured.", 503);
  return audit;
}
