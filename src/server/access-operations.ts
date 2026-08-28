import "server-only";

import { accessDecisionCommandSchema, accessOperationsCandidateSchema, type AccessDecisionCommand, type AccessOperationsFilter } from "@/domain/access-operations";
import { appendMutationId, reviewAccessDecisionAuditSchema, reviewAccessInterestSchema } from "@/domain/product-activation";
import { ACTIVATION_COLLECTIONS, ActivationConflictError, ActivationNotFoundError, REVIEW_ACCESS_PROGRAM_VERSION } from "./product-activation-storage";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const OPERATOR_LIST_LIMIT = 200;

export async function listReviewAccessCandidates(filter: AccessOperationsFilter, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const snapshot = await db.collection(ACTIVATION_COLLECTIONS.reviewAccessInterests).limit(OPERATOR_LIST_LIMIT + 1).get();
  const partial = snapshot.size > OPERATOR_LIST_LIMIT;
  const records = snapshot.docs.slice(0, OPERATOR_LIST_LIMIT)
    .map((document) => reviewAccessInterestSchema.safeParse(document.data()))
    .filter((result): result is { success: true; data: ReturnType<typeof reviewAccessInterestSchema.parse> } => result.success)
    .map((result) => result.data)
    .filter((record) => !filter.cohort || record.cohort === filter.cohort)
    .filter((record) => !filter.category || record.preferredCategory === filter.category)
    .filter((record) => !filter.status || record.status === filter.status)
    .filter((record) => matchesAge(record.createdAt, filter.age, now))
    .map(toCandidate);
  return { partial, records };
}

export async function applyReviewAccessDecision(actorUserId: string, input: AccessDecisionCommand, now = new Date()) {
  const command = accessDecisionCommandSchema.parse(input);
  if (actorUserId === command.targetUserId) throw new ActivationConflictError("Operators cannot decide their own review access.");
  const db = await getFirebaseAdminFirestore();
  const interestReference = db.collection(ACTIVATION_COLLECTIONS.reviewAccessInterests).doc(ownedInterestId(command.targetUserId));
  const auditReference = db.collection(ACTIVATION_COLLECTIONS.reviewAccessDecisionAudit).doc(command.eventId);
  return db.runTransaction(async (transaction) => {
    const [interestSnapshot, auditSnapshot] = await Promise.all([transaction.get(interestReference), transaction.get(auditReference)]);
    if (!interestSnapshot.exists || interestSnapshot.data()?.userId !== command.targetUserId) throw new ActivationNotFoundError();
    const current = reviewAccessInterestSchema.parse(interestSnapshot.data());
    if (auditSnapshot.exists) {
      const audit = reviewAccessDecisionAuditSchema.parse(auditSnapshot.data());
      if (audit.actorUserId !== actorUserId || audit.targetUserId !== command.targetUserId || audit.decision !== command.decision || audit.reasonCode !== command.reasonCode) throw new ActivationConflictError("The decision event ID was already used.");
      return toCandidate(current);
    }
    if (current.revision !== command.expectedRevision) throw new ActivationConflictError(undefined, current.revision);
    if (command.decision === "approve" && !current.contactPermission) throw new ActivationConflictError("Access cannot be approved after contact permission was revoked.", current.revision);
    const nextStatus = command.decision === "approve" ? "invited" : command.decision === "decline" ? "declined" : command.decision === "expire" ? "expired" : "revoked";
    const timestamp = now.toISOString();
    const next = reviewAccessInterestSchema.parse({
      ...current,
      revision: current.revision + 1,
      status: nextStatus,
      contactPermission: nextStatus === "revoked" ? false : current.contactPermission,
      updatedAt: timestamp,
      recentMutationIds: appendMutationId(current.recentMutationIds, command.eventId),
    });
    const audit = reviewAccessDecisionAuditSchema.parse({
      schemaVersion: 1,
      eventId: command.eventId,
      targetUserId: command.targetUserId,
      actorUserId,
      programVersion: current.programVersion,
      decision: command.decision,
      reasonCode: command.reasonCode,
      previousStatus: current.status,
      nextStatus,
      createdAt: timestamp,
    });
    transaction.set(interestReference, next);
    transaction.create(auditReference, audit);
    return toCandidate(next);
  });
}

function toCandidate(record: ReturnType<typeof reviewAccessInterestSchema.parse>) {
  return accessOperationsCandidateSchema.parse({
    targetUserId: record.userId,
    revision: record.revision,
    cohort: record.cohort,
    preferredCategory: record.preferredCategory,
    clientWorkIntent: record.clientWorkIntent,
    contactPermission: record.contactPermission,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function matchesAge(createdAt: string, age: AccessOperationsFilter["age"], now: Date) {
  if (!age) return true;
  const days = Math.max(0, Math.floor((now.getTime() - Date.parse(createdAt)) / (24 * 60 * 60 * 1_000)));
  if (age === "0-7-days") return days <= 7;
  if (age === "8-30-days") return days >= 8 && days <= 30;
  return days >= 31;
}

function ownedInterestId(userId: string) {
  return `${userId.length}_${userId}_${REVIEW_ACCESS_PROGRAM_VERSION}`;
}
