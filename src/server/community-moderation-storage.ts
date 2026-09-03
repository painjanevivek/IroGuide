import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { assertAccountDeletionUnlockedInTransaction } from "./account-deletion-lock";
import {
  communityAccountModerationSchema,
  communityAppealSchema,
  communityAuditSchema,
  communityCommentRecordSchema,
  communityConsentSchema,
  communityModerationActionRecordSchema,
  communityReportRecordSchema,
  communityStoredProjectionSchema,
} from "@/domain/community-safety";
import { isCommunityModerator, isCommunitySeniorModerator } from "./community-safety-config";
import { COMMUNITY_COLLECTIONS, communityDigest, createCommunityAuditRecord } from "./community-records";
import { CommunityMutationError } from "./community-projection-storage";
import { getFirebaseAdminFirestore } from "./firebase-admin";

export const communityModerationCommandSchema = z.discriminatedUnion("command", [
  z.strictObject({
    command: z.literal("act"),
    action: z.enum(["remove", "restore", "warn", "restrict", "ban"]),
    targetType: z.enum(["post", "comment", "account"]),
    targetId: z.string().regex(/^[A-Za-z0-9_.-]+$/).max(320),
    reasonCode: z.string().trim().min(2).max(80),
    reportId: z.string().regex(/^[A-Za-z0-9_.-]+$/).max(320).optional(),
  }),
  z.strictObject({
    command: z.literal("resolve-appeal"),
    appealId: z.string().regex(/^[A-Za-z0-9_.-]+$/).max(320),
    outcome: z.enum(["uphold", "reverse"]),
    reasonCode: z.string().trim().min(2).max(80),
  }),
]);

export async function listCommunityModerationQueue(moderatorId: string) {
  requireModerator(moderatorId);
  const db = await getFirebaseAdminFirestore();
  const [reports, appeals] = await Promise.all([
    db.collection(COMMUNITY_COLLECTIONS.reports).where("status", "in", ["queued", "reviewing"]).limit(100).get(),
    db.collection(COMMUNITY_COLLECTIONS.appeals).where("status", "==", "queued").limit(100).get(),
  ]);
  return {
    appeals: appeals.docs.flatMap((document) => {
      const parsed = communityAppealSchema.safeParse(document.data());
      return parsed.success ? [parsed.data] : [];
    }),
    reports: reports.docs.flatMap((document) => {
      const parsed = communityReportRecordSchema.safeParse(document.data());
      return parsed.success ? [parsed.data] : [];
    }),
    sampled: reports.size === 100 || appeals.size === 100,
  };
}

export async function applyCommunityModerationCommand(moderatorId: string, input: unknown, now = new Date()) {
  requireModerator(moderatorId);
  const command = communityModerationCommandSchema.parse(input);
  if (command.command === "resolve-appeal") return resolveCommunityAppeal(moderatorId, command, now);
  if (command.action === "ban" && !isCommunitySeniorModerator(moderatorId)) {
    throw new CommunityMutationError("A senior moderator must approve account bans.", 403);
  }
  if ((command.action === "remove" || command.action === "restore") && command.targetType === "account") {
    throw new CommunityMutationError("Content actions require a post or comment target.", 400);
  }
  if ((command.action === "warn" || command.action === "restrict" || command.action === "ban") && command.targetType !== "account") {
    throw new CommunityMutationError("Account actions require an account target.", 400);
  }

  const db = await getFirebaseAdminFirestore();
  const actionId = randomUUID();
  const targetReference = getTargetReference(db, command.targetType, command.targetId);
  const reportReference = command.reportId ? db.collection(COMMUNITY_COLLECTIONS.reports).doc(command.reportId) : null;
  const audit = requireModeratorAudit(command.action, moderatorId, now, command.reasonCode, command.targetId, command.targetType);
  const action = communityModerationActionRecordSchema.parse({
    schemaVersion: 1,
    id: actionId,
    action: command.action,
    targetType: command.targetType,
    targetId: command.targetId,
    reasonCode: command.reasonCode,
    auditEventId: audit.id,
    moderatorId,
    reversalOfActionId: null,
    createdAt: now.toISOString(),
  });

  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: moderatorId });
    const [targetSnapshot, reportSnapshot] = await Promise.all([
      transaction.get(targetReference),
      reportReference ? transaction.get(reportReference) : Promise.resolve(null),
    ]);
    const target = assertModerationTarget(targetSnapshot.data(), command.targetType);
    if (command.targetType === "comment" && communityCommentRecordSchema.parse(target).authorDeletedAt !== null) {
      throw new CommunityMutationError("Author-deleted comments cannot be moderated or restored.", 409);
    }
    const report = reportReference ? communityReportRecordSchema.safeParse(reportSnapshot?.data()) : null;
    if (report && (
      !report.success
      || !["queued", "reviewing"].includes(report.data.status)
      || report.data.targetType !== command.targetType
      || report.data.targetId !== command.targetId
    )) throw new CommunityMutationError("The moderation report does not match this target.", 409);
    if (command.action === "restore") await assertRestorableTarget(transaction, db, command.targetType, target);

    if (command.targetType === "post") transaction.update(targetReference, {
      moderationState: command.action === "remove" ? "removed" : "clear",
      moderationActionId: actionId,
      visibility: command.action === "remove" ? "hidden" : "public",
      updatedAt: now.toISOString(),
    });
    if (command.targetType === "comment") transaction.update(targetReference, {
      moderationState: command.action === "remove" ? "removed" : "clear",
      moderationActionId: actionId,
      status: command.action === "remove" ? "removed" : "visible",
      updatedAt: now.toISOString(),
    });
    if (command.targetType === "account") {
      const state = command.action === "warn" ? "warned" : command.action === "restrict" ? "restricted" : "banned";
      const account = communityAccountModerationSchema.parse({ schemaVersion: 1, accountId: command.targetId, state, actionId, updatedAt: now.toISOString() });
      transaction.set(targetReference, account);
    }
    if (reportReference) transaction.update(reportReference, {
      status: "resolved",
      resolutionActionId: actionId,
      resolverId: moderatorId,
      updatedAt: now.toISOString(),
    });
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.moderationActions).doc(actionId), action);
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
  });
  return { actionId };
}

export async function exportCommunityModerationAudit(moderatorId: string) {
  requireModerator(moderatorId);
  const db = await getFirebaseAdminFirestore();
  const snapshot = await db.collection(COMMUNITY_COLLECTIONS.audit).limit(500).get();
  return {
    events: snapshot.docs.flatMap((document) => {
      const parsed = communityAuditSchema.safeParse(document.data());
      return parsed.success ? [parsed.data] : [];
    }),
    sampled: snapshot.size === 500,
  };
}

async function resolveCommunityAppeal(
  moderatorId: string,
  command: Extract<z.infer<typeof communityModerationCommandSchema>, { command: "resolve-appeal" }>,
  now: Date,
) {
  if (!isCommunitySeniorModerator(moderatorId)) throw new CommunityMutationError("A senior moderator must resolve appeals.", 403);
  const db = await getFirebaseAdminFirestore();
  const appealReference = db.collection(COMMUNITY_COLLECTIONS.appeals).doc(command.appealId);
  return db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: moderatorId });
    const appeal = communityAppealSchema.safeParse((await transaction.get(appealReference)).data());
    if (!appeal.success || appeal.data.status !== "queued") throw new CommunityMutationError("The appeal is no longer available.", 404);
    if (appeal.data.originalModeratorId === moderatorId) throw new CommunityMutationError("Appeals require an independent reviewer.", 409);
    const originalReference = db.collection(COMMUNITY_COLLECTIONS.moderationActions).doc(appeal.data.actionId);
    const original = communityModerationActionRecordSchema.safeParse((await transaction.get(originalReference)).data());
    if (!original.success) throw new CommunityMutationError("The appealed action is no longer available.", 404);
    const targetReference = getTargetReference(db, original.data.targetType, original.data.targetId);
    const targetSnapshot = await transaction.get(targetReference);
    const target = assertModerationTarget(targetSnapshot.data(), original.data.targetType);
    if (command.outcome === "reverse" && getEffectiveModerationActionId(original.data.targetType, target) !== original.data.id) {
      throw new CommunityMutationError("A newer moderation action supersedes this appeal.", 409);
    }
    if (command.outcome === "reverse" && original.data.action === "remove") {
      await assertRestorableTarget(transaction, db, original.data.targetType, target);
    }

    const actionId = randomUUID();
    const actionName = command.outcome === "reverse" ? "appeal-reverse" : "appeal-uphold";
    const audit = requireModeratorAudit(actionName, moderatorId, now, command.reasonCode, command.appealId, "appeal");
    const action = communityModerationActionRecordSchema.parse({
      schemaVersion: 1,
      id: actionId,
      action: actionName,
      targetType: original.data.targetType,
      targetId: original.data.targetId,
      reasonCode: command.reasonCode,
      auditEventId: audit.id,
      moderatorId,
      reversalOfActionId: original.data.id,
      createdAt: now.toISOString(),
    });
    if (command.outcome === "reverse") reverseModerationTarget(transaction, targetReference, original.data.targetType, actionId, now);
    transaction.update(appealReference, { status: command.outcome === "reverse" ? "reversed" : "upheld", reviewerId: moderatorId, updatedAt: now.toISOString() });
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.moderationActions).doc(actionId), action);
    transaction.create(db.collection(COMMUNITY_COLLECTIONS.audit).doc(audit.id), audit);
    return { actionId, outcome: command.outcome };
  });
}

function reverseModerationTarget(transaction: FirebaseFirestore.Transaction, reference: FirebaseFirestore.DocumentReference, targetType: "post" | "comment" | "account", actionId: string, now: Date) {
  if (targetType === "post") transaction.update(reference, { moderationState: "clear", moderationActionId: actionId, visibility: "public", updatedAt: now.toISOString() });
  if (targetType === "comment") transaction.update(reference, { moderationState: "clear", moderationActionId: actionId, status: "visible", updatedAt: now.toISOString() });
  if (targetType === "account") transaction.set(reference, communityAccountModerationSchema.parse({ schemaVersion: 1, accountId: reference.id, state: "clear", actionId, updatedAt: now.toISOString() }));
}

function getEffectiveModerationActionId(targetType: "post" | "comment" | "account", target: unknown) {
  if (targetType === "post") return communityStoredProjectionSchema.parse(target).moderationActionId;
  if (targetType === "comment") return communityCommentRecordSchema.parse(target).moderationActionId;
  return communityAccountModerationSchema.parse(target).actionId;
}

function getTargetReference(db: FirebaseFirestore.Firestore, targetType: "post" | "comment" | "account", targetId: string) {
  if (targetType === "post") return db.collection(COMMUNITY_COLLECTIONS.projections).doc(targetId);
  if (targetType === "comment") return db.collection(COMMUNITY_COLLECTIONS.comments).doc(targetId);
  return db.collection(COMMUNITY_COLLECTIONS.accountModeration).doc(targetId);
}

function assertModerationTarget(value: unknown, targetType: "post" | "comment" | "account") {
  if (targetType === "post") {
    const parsed = communityStoredProjectionSchema.safeParse(value);
    if (!parsed.success) throw new CommunityMutationError("The moderation target was not found.", 404);
    return parsed.data;
  }
  if (targetType === "comment") {
    const parsed = communityCommentRecordSchema.safeParse(value);
    if (!parsed.success) throw new CommunityMutationError("The moderation target was not found.", 404);
    return parsed.data;
  }
  if (value !== undefined && !communityAccountModerationSchema.safeParse(value).success) throw new CommunityMutationError("The moderation target is invalid.", 409);
  return value;
}

async function assertRestorableTarget(
  transaction: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  targetType: "post" | "comment" | "account",
  target: unknown,
) {
  if (targetType === "post") {
    const projection = communityStoredProjectionSchema.parse(target);
    const consentReference = db.collection(COMMUNITY_COLLECTIONS.consents)
      .doc(communityDigest(projection.ownerId, projection.sourceReviewId, projection.postId));
    const consent = communityConsentSchema.safeParse((await transaction.get(consentReference)).data());
    if (!consent.success || consent.data.state !== "active" || consent.data.derivativeState !== "active") {
      throw new CommunityMutationError("Withdrawn content cannot be restored.", 409);
    }
  }
  if (targetType === "comment") {
    const comment = communityCommentRecordSchema.parse(target);
    if (comment.status === "deleted" || comment.authorDeletedAt !== null) {
      throw new CommunityMutationError("Author-deleted comments cannot be restored.", 409);
    }
    const projection = communityStoredProjectionSchema.safeParse((await transaction.get(
      db.collection(COMMUNITY_COLLECTIONS.projections).doc(comment.postId),
    )).data());
    if (!projection.success || projection.data.visibility !== "public" || projection.data.moderationState === "removed") {
      throw new CommunityMutationError("A comment cannot be restored on hidden content.", 409);
    }
  }
}

function requireModerator(uid: string) {
  if (!isCommunityModerator(uid)) throw new CommunityMutationError("This account cannot access Community moderation.", 403);
}

function requireModeratorAudit(action: string, actorId: string, now: Date, reasonCode: string, targetId: string, targetType: "post" | "comment" | "account" | "appeal") {
  const audit = createCommunityAuditRecord({ action, actorId, actorRole: "moderator", now, reasonCode, targetId, targetType });
  if (!audit) throw new CommunityMutationError("Community audit storage is not configured.", 503);
  return audit;
}
