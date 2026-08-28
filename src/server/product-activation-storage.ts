import "server-only";

import type { DocumentReference, Firestore, Transaction } from "firebase-admin/firestore";
import {
  ACTIVATION_SCHEMA_VERSION,
  DESIGN_BRIEF_FLOW_VERSION,
  accessInterestStatuses,
  accountExperienceSchema,
  appendMutationId,
  createDefaultAccountExperience,
  deriveNextActivationStep,
  derivePriorityItemIds,
  designBriefDraftSchema,
  designBriefPutSchema,
  isGuestProgressExpired,
  mergeSampleProgress,
  ownedSampleCatalog,
  reviewAccessInterestSchema,
  sampleCritiqueProgressSchema,
  selfReviewSessionSchema,
  type AccessInterestCreate,
  type AccessInterestRevoke,
  type AccountExperience,
  type AccountExperiencePatch,
  type DesignBriefDraft,
  type DesignBriefPut,
  type SampleCritiqueProgress,
  type SelfReviewCreate,
  type SelfReviewPatch,
  type SelfReviewSession,
} from "@/domain/product-activation";
import { ACCOUNT_DELETION_LOCKS_COLLECTION, assertAccountDeletionUnlocked, assertAccountDeletionUnlockedInTransaction } from "./account-deletion-lock";
import { getFirebaseAdminFirestore } from "./firebase-admin";

export const ACTIVATION_COLLECTIONS = Object.freeze({
  accountExperiences: "accountExperiences",
  sampleCritiqueProgress: "sampleCritiqueProgress",
  selfReviewSessions: "selfReviewSessions",
  designBriefDrafts: "designBriefDrafts",
  reviewAccessInterests: "reviewAccessInterests",
  reviewAccessDecisionAudit: "reviewAccessDecisionAudit",
});

export const REVIEW_ACCESS_PROGRAM_VERSION = "provider-alpha-v1";
const LIST_LIMIT = 50;

export class ActivationConflictError extends Error {
  readonly status = 409;

  constructor(message = "This record changed in another session. Refresh and try again.", readonly currentRevision?: number) {
    super(message);
    this.name = "ActivationConflictError";
  }
}

export class ActivationNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("The requested record was not found.");
    this.name = "ActivationNotFoundError";
  }
}

export type ActivationDeleteResult = {
  accountExperiencesDeleted: number;
  briefsDeleted: number;
  decisionAuditDeleted: number;
  interestsDeleted: number;
  sampleProgressDeleted: number;
  selfReviewsDeleted: number;
  failures: string[];
  status: "complete" | "retry-required";
};

export class ActivationDeletionIncompleteError extends Error {
  readonly status = 503;

  constructor(readonly result: ActivationDeleteResult) {
    super("Activation data cleanup is incomplete and must be retried.");
    this.name = "ActivationDeletionIncompleteError";
  }
}

export async function getAccountExperienceBundle(userId: string, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  await assertAccountDeletionUnlocked(userId);
  const [experienceSnapshot, progressSnapshot, interestSnapshot] = await Promise.all([
    db.collection(ACTIVATION_COLLECTIONS.accountExperiences).doc(userId).get(),
    db.collection(ACTIVATION_COLLECTIONS.sampleCritiqueProgress).where("userId", "==", userId).limit(LIST_LIMIT).get(),
    db.collection(ACTIVATION_COLLECTIONS.reviewAccessInterests).doc(ownedDocumentId(userId, REVIEW_ACCESS_PROGRAM_VERSION)).get(),
  ]);
  const experience = experienceSnapshot.exists ? accountExperienceSchema.parse(experienceSnapshot.data()) : null;
  if (experience && experience.userId !== userId) throw new ActivationNotFoundError();
  return {
    experience: experience ?? createDefaultAccountExperience(userId, now),
    sampleProgress: progressSnapshot.docs.map((document) => sampleCritiqueProgressSchema.parse(document.data())),
    accessInterest: interestSnapshot.exists && interestSnapshot.data()?.userId === userId
      ? reviewAccessInterestSchema.parse(interestSnapshot.data())
      : null,
  };
}

export async function patchAccountExperience(userId: string, input: AccountExperiencePatch, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const timestamp = now.toISOString();
  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const reference = db.collection(ACTIVATION_COLLECTIONS.accountExperiences).doc(userId);
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists
      ? accountExperienceSchema.parse(snapshot.data())
      : createDefaultAccountExperience(userId, now);
    if (current.userId !== userId) throw new ActivationNotFoundError();
    if (current.recentMutationIds.includes(input.mutationId)) return;
    assertRevision(current.revision, input.expectedRevision);
    const next = buildNextExperience(current, input, timestamp);
    if (input.sampleProgress) {
      await writeSampleMutationInTransaction({ db, input: input.sampleProgress, mutationId: input.mutationId, now, transaction, userId });
    } else if (input.guestProgress && !isGuestProgressExpired(input.guestProgress, now)) {
      await mergeGuestProgressInTransaction({ db, guest: input.guestProgress, mutationId: input.mutationId, now, transaction, userId });
    }
    transaction.set(reference, next);
  });
  if (input.action === "import-legacy") await importLegacyDesignBrief(userId, now);
  return getAccountExperienceBundle(userId, now);
}

export async function listSelfReviews(userId: string, id?: string) {
  const db = await getFirebaseAdminFirestore();
  await assertAccountDeletionUnlocked(userId);
  if (id) {
    const snapshot = await db.collection(ACTIVATION_COLLECTIONS.selfReviewSessions).doc(ownedDocumentId(userId, id)).get();
    if (!snapshot.exists || snapshot.data()?.userId !== userId) return [];
    return [selfReviewSessionSchema.parse(snapshot.data())];
  }
  const snapshot = await db.collection(ACTIVATION_COLLECTIONS.selfReviewSessions)
    .where("userId", "==", userId).orderBy("updatedAt", "desc").limit(LIST_LIMIT).get();
  return snapshot.docs.map((document) => selfReviewSessionSchema.parse(document.data()));
}

export async function createSelfReview(userId: string, input: SelfReviewCreate, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(ACTIVATION_COLLECTIONS.selfReviewSessions).doc(ownedDocumentId(userId, input.id));
  const timestamp = now.toISOString();
  return db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const snapshot = await transaction.get(reference);
    if (snapshot.exists) {
      const current = selfReviewSessionSchema.parse(snapshot.data());
      if (current.userId === userId && current.recentMutationIds.includes(input.mutationId)) return current;
      throw new ActivationConflictError("A self-review with this ID already exists.", current.revision);
    }
    const record = selfReviewSessionSchema.parse({
      id: input.id,
      userId,
      schemaVersion: ACTIVATION_SCHEMA_VERSION,
      revision: 0,
      rubricVersion: input.rubricVersion,
      category: input.category,
      goalLabel: input.goalLabel,
      responses: input.responses,
      priorityItemIds: derivePriorityItemIds(input.category, input.responses),
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
      recentMutationIds: [input.mutationId],
    });
    transaction.create(reference, record);
    return record;
  });
}

export async function patchSelfReview(userId: string, input: SelfReviewPatch, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(ACTIVATION_COLLECTIONS.selfReviewSessions).doc(ownedDocumentId(userId, input.id));
  return db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists || snapshot.data()?.userId !== userId) throw new ActivationNotFoundError();
    const current = selfReviewSessionSchema.parse(snapshot.data());
    if (current.recentMutationIds.includes(input.mutationId)) return current;
    assertRevision(current.revision, input.expectedRevision);
    assertSelfReviewTransition(current.status, input.changes.status ?? current.status);
    const responses = input.changes.responses ?? current.responses;
    const next = selfReviewSessionSchema.parse({
      ...current,
      ...input.changes,
      responses,
      priorityItemIds: derivePriorityItemIds(current.category, responses),
      revision: current.revision + 1,
      updatedAt: now.toISOString(),
      recentMutationIds: appendMutationId(current.recentMutationIds, input.mutationId),
    });
    transaction.set(reference, next);
    return next;
  });
}

export async function deleteSelfReviews(userId: string, id?: string) {
  const db = await getFirebaseAdminFirestore();
  await assertAccountDeletionUnlocked(userId);
  if (id) {
    const reference = db.collection(ACTIVATION_COLLECTIONS.selfReviewSessions).doc(ownedDocumentId(userId, id));
    const snapshot = await reference.get();
    if (snapshot.exists && snapshot.data()?.userId === userId) await reference.delete();
    return { deleted: snapshot.exists && snapshot.data()?.userId === userId ? 1 : 0 };
  }
  return { deleted: await deleteOwnedQuery(db, ACTIVATION_COLLECTIONS.selfReviewSessions, userId) };
}

export async function listDesignBriefs(userId: string, id?: string) {
  const db = await getFirebaseAdminFirestore();
  await assertAccountDeletionUnlocked(userId);
  if (id) {
    const snapshot = await db.collection(ACTIVATION_COLLECTIONS.designBriefDrafts).doc(ownedDocumentId(userId, id)).get();
    if (!snapshot.exists || snapshot.data()?.userId !== userId) return [];
    return [designBriefDraftSchema.parse(snapshot.data())];
  }
  const snapshot = await db.collection(ACTIVATION_COLLECTIONS.designBriefDrafts)
    .where("userId", "==", userId).orderBy("updatedAt", "desc").limit(LIST_LIMIT).get();
  return snapshot.docs.map((document) => designBriefDraftSchema.parse(document.data()));
}

export async function putDesignBrief(userId: string, input: DesignBriefPut, now = new Date(), importedFromLegacy = false) {
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(ACTIVATION_COLLECTIONS.designBriefDrafts).doc(ownedDocumentId(userId, input.id));
  return db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists ? designBriefDraftSchema.parse(snapshot.data()) : null;
    if (current && current.userId !== userId) throw new ActivationNotFoundError();
    if (current?.recentMutationIds.includes(input.mutationId)) return current;
    if (current) assertRevision(current.revision, input.expectedRevision);
    if (!current && input.expectedRevision !== null) throw new ActivationConflictError("The design brief no longer exists.");
    if (current) assertBriefTransition(current.status, input.status);
    const timestamp = now.toISOString();
    const record = designBriefDraftSchema.parse({
      id: input.id,
      userId,
      schemaVersion: ACTIVATION_SCHEMA_VERSION,
      revision: current ? current.revision + 1 : 0,
      category: input.category,
      audience: input.audience,
      purpose: input.purpose,
      style: input.style,
      goal: input.goal,
      concern: input.concern,
      constraints: input.constraints,
      mode: input.mode,
      step: input.step,
      flowVersion: input.flowVersion,
      status: input.status,
      createdAt: current?.createdAt ?? timestamp,
      updatedAt: timestamp,
      recentMutationIds: appendMutationId(current?.recentMutationIds ?? [], input.mutationId),
      importedFromLegacy: current?.importedFromLegacy ?? importedFromLegacy,
    });
    transaction.set(reference, record);
    return record;
  });
}

export async function deleteDesignBrief(userId: string, id: string) {
  const db = await getFirebaseAdminFirestore();
  await assertAccountDeletionUnlocked(userId);
  const reference = db.collection(ACTIVATION_COLLECTIONS.designBriefDrafts).doc(ownedDocumentId(userId, id));
  const snapshot = await reference.get();
  if (snapshot.exists && snapshot.data()?.userId === userId) await reference.delete();
  return { deleted: snapshot.exists && snapshot.data()?.userId === userId };
}

export async function importLegacyDesignBrief(userId: string, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  await assertAccountDeletionUnlocked(userId);
  const legacyReference = db.collection("reviewDrafts").doc(`${userId}_active`);
  const destinationReference = db.collection(ACTIVATION_COLLECTIONS.designBriefDrafts).doc(ownedDocumentId(userId, "legacy-active"));
  const [legacySnapshot, destinationSnapshot] = await Promise.all([legacyReference.get(), destinationReference.get()]);
  if (destinationSnapshot.exists) return designBriefDraftSchema.parse(destinationSnapshot.data());
  if (!legacySnapshot.exists || legacySnapshot.data()?.userId !== userId) return null;
  const legacy = legacySnapshot.data() as Record<string, unknown>;
  const brief = isRecord(legacy.brief) ? legacy.brief : {};
  const input = designBriefPutSchema.parse({
    schemaVersion: ACTIVATION_SCHEMA_VERSION,
    id: "legacy-active",
    expectedRevision: null,
    mutationId: "legacy-import-v1",
    category: reviewCategoriesIncludes(legacy.category) ? legacy.category : null,
    audience: stringValue(brief.audience, 240),
    purpose: stringValue(brief.purpose, 400),
    style: stringValue(brief.style, 240),
    goal: stringValue(brief.goal, 240),
    concern: stringValue(brief.concern, 400),
    constraints: "",
    mode: feedbackModeIncludes(legacy.mode) ? legacy.mode : "mentor",
    step: boundedInteger(legacy.step, 1, 4, 1),
    flowVersion: DESIGN_BRIEF_FLOW_VERSION,
    status: "draft",
  });
  const imported = await putDesignBrief(userId, input, now, true);
  const verifiedSnapshot = await destinationReference.get();
  const verified = designBriefDraftSchema.parse(verifiedSnapshot.data());
  if (verified.id !== imported.id || verified.userId !== userId) throw new Error("Legacy brief verification failed.");
  return verified;
}

export async function recordAccessInterest(userId: string, input: AccessInterestCreate, now = new Date()) {
  if (input.programVersion !== REVIEW_ACCESS_PROGRAM_VERSION) throw new ActivationConflictError("The review access program version is not available.");
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(ACTIVATION_COLLECTIONS.reviewAccessInterests).doc(ownedDocumentId(userId, input.programVersion));
  const experienceReference = db.collection(ACTIVATION_COLLECTIONS.accountExperiences).doc(userId);
  return db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const [snapshot, experienceSnapshot] = await Promise.all([transaction.get(reference), transaction.get(experienceReference)]);
    const current = snapshot.exists ? reviewAccessInterestSchema.parse(snapshot.data()) : null;
    if (current && current.userId !== userId) throw new ActivationNotFoundError();
    if (current?.recentMutationIds.includes(input.mutationId)) return current;
    if (current) assertRevision(current.revision, input.expectedRevision);
    if (!current && input.expectedRevision !== null) throw new ActivationConflictError("The review access interest no longer exists.");
    const experience = experienceSnapshot.exists
      ? accountExperienceSchema.parse(experienceSnapshot.data())
      : createDefaultAccountExperience(userId, now);
    if (experience.userId !== userId) throw new ActivationNotFoundError();
    const timestamp = now.toISOString();
    const preservesDecision = current && ["invited", "declined", "expired"].includes(current.status);
    const record = reviewAccessInterestSchema.parse({
      userId,
      schemaVersion: ACTIVATION_SCHEMA_VERSION,
      revision: current ? current.revision + 1 : 0,
      programVersion: input.programVersion,
      cohort: experience.primaryRole ?? "other",
      preferredCategory: input.preferredCategory,
      clientWorkIntent: input.clientWorkIntent,
      contactPermission: input.contactPermission,
      status: preservesDecision ? current.status : "interested",
      createdAt: current?.createdAt ?? timestamp,
      updatedAt: timestamp,
      recentMutationIds: appendMutationId(current?.recentMutationIds ?? [], input.mutationId),
    });
    transaction.set(reference, record);
    return record;
  });
}

export async function revokeAccessInterest(userId: string, input: AccessInterestRevoke, now = new Date()) {
  if (input.programVersion !== REVIEW_ACCESS_PROGRAM_VERSION) return null;
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(ACTIVATION_COLLECTIONS.reviewAccessInterests).doc(ownedDocumentId(userId, input.programVersion));
  return db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists || snapshot.data()?.userId !== userId) return null;
    const current = reviewAccessInterestSchema.parse(snapshot.data());
    if (current.recentMutationIds.includes(input.mutationId) || (current.status === "revoked" && !current.contactPermission)) return current;
    if (input.expectedRevision !== null) assertRevision(current.revision, input.expectedRevision);
    const next = reviewAccessInterestSchema.parse({
      ...current,
      revision: current.revision + 1,
      status: "revoked",
      contactPermission: false,
      updatedAt: now.toISOString(),
      recentMutationIds: appendMutationId(current.recentMutationIds, input.mutationId),
    });
    transaction.set(reference, next);
    return next;
  });
}

export async function clearLearningHistory(userId: string, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  await assertAccountDeletionUnlocked(userId);
  const [sampleProgressDeleted, selfReviewsDeleted] = await Promise.all([
    deleteOwnedQuery(db, ACTIVATION_COLLECTIONS.sampleCritiqueProgress, userId),
    deleteOwnedQuery(db, ACTIVATION_COLLECTIONS.selfReviewSessions, userId),
  ]);
  const experienceReference = db.collection(ACTIVATION_COLLECTIONS.accountExperiences).doc(userId);
  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId });
    const snapshot = await transaction.get(experienceReference);
    if (!snapshot.exists) return;
    const current = accountExperienceSchema.parse(snapshot.data());
    const steps = { ...current.steps };
    delete steps["inspect-sample"];
    delete steps["practice-rubric"];
    transaction.set(experienceReference, accountExperienceSchema.parse({
      ...current,
      revision: current.revision + 1,
      steps,
      nextStep: deriveNextActivationStep(steps),
      completedAt: null,
      updatedAt: now.toISOString(),
    }));
  });
  return { sampleProgressDeleted, selfReviewsDeleted };
}

export async function deleteActivationDataForUser(userId: string): Promise<ActivationDeleteResult> {
  const db = await getFirebaseAdminFirestore();
  const empty = createDeleteResult();
  try {
    await db.collection(ACCOUNT_DELETION_LOCKS_COLLECTION).doc(userId).set({
      schemaVersion: 1,
      state: "deleting",
      updatedAt: new Date().toISOString(),
      userId,
    }, { merge: true });
  } catch {
    const result = { ...empty, failures: ["deletion-lock"], status: "retry-required" as const };
    throw new ActivationDeletionIncompleteError(result);
  }
  const operations = await Promise.allSettled([
    deleteExactDocument(db, ACTIVATION_COLLECTIONS.accountExperiences, userId),
    deleteOwnedQuery(db, ACTIVATION_COLLECTIONS.sampleCritiqueProgress, userId),
    deleteOwnedQuery(db, ACTIVATION_COLLECTIONS.selfReviewSessions, userId),
    deleteOwnedQuery(db, ACTIVATION_COLLECTIONS.designBriefDrafts, userId),
    deleteOwnedQuery(db, ACTIVATION_COLLECTIONS.reviewAccessInterests, userId),
    deleteAccessDecisionAuditForUser(db, userId),
  ]);
  const names = ["account-experience", "sample-progress", "self-reviews", "briefs", "interests", "decision-audit"] as const;
  const failures = operations.flatMap((operation, index) => operation.status === "rejected" ? [names[index]] : []);
  const result: ActivationDeleteResult = {
    accountExperiencesDeleted: settledCount(operations[0]),
    sampleProgressDeleted: settledCount(operations[1]),
    selfReviewsDeleted: settledCount(operations[2]),
    briefsDeleted: settledCount(operations[3]),
    interestsDeleted: settledCount(operations[4]),
    decisionAuditDeleted: settledCount(operations[5]),
    failures,
    status: failures.length > 0 ? "retry-required" : "complete",
  };
  if (failures.length > 0) throw new ActivationDeletionIncompleteError(result);
  return result;
}

export async function getActivationSupportAggregates() {
  const db = await getFirebaseAdminFirestore();
  const [interestSnapshot, selfReviewSnapshot, briefSnapshot] = await Promise.all([
    db.collection(ACTIVATION_COLLECTIONS.reviewAccessInterests).limit(500).get(),
    db.collection(ACTIVATION_COLLECTIONS.selfReviewSessions).limit(500).get(),
    db.collection(ACTIVATION_COLLECTIONS.designBriefDrafts).limit(500).get(),
  ]);
  const byInterestStatus = Object.fromEntries(accessInterestStatuses.map((status) => [status, 0])) as Record<(typeof accessInterestStatuses)[number], number>;
  const byCohort: Record<string, number> = {};
  for (const document of interestSnapshot.docs) {
    const record = reviewAccessInterestSchema.parse(document.data());
    byInterestStatus[record.status] += 1;
    byCohort[record.cohort] = (byCohort[record.cohort] ?? 0) + 1;
  }
  const selfReviewsByCategory: Record<string, number> = {};
  for (const document of selfReviewSnapshot.docs) {
    const record = selfReviewSessionSchema.parse(document.data());
    selfReviewsByCategory[record.category] = (selfReviewsByCategory[record.category] ?? 0) + 1;
  }
  const briefsByStatus: Record<string, number> = {};
  for (const document of briefSnapshot.docs) {
    const record = designBriefDraftSchema.parse(document.data());
    briefsByStatus[record.status] = (briefsByStatus[record.status] ?? 0) + 1;
  }
  return {
    byCohort,
    byInterestStatus,
    briefsByStatus,
    selfReviewsByCategory,
    bounded: true,
    truncated: [interestSnapshot, selfReviewSnapshot, briefSnapshot].some((snapshot) => snapshot.size === 500),
    observedRecords: interestSnapshot.size + selfReviewSnapshot.size + briefSnapshot.size,
  };
}

export function toPublicActivationRecord<T extends { userId: string; recentMutationIds: string[] }>(record: T) {
  const publicRecord: Omit<T, "userId" | "recentMutationIds"> & Partial<Pick<T, "userId" | "recentMutationIds">> = { ...record };
  delete publicRecord.userId;
  delete publicRecord.recentMutationIds;
  return publicRecord;
}

function buildNextExperience(current: AccountExperience, input: AccountExperiencePatch, timestamp: string) {
  if (input.action === "reset-onboarding") {
    return accountExperienceSchema.parse({
      ...current,
      revision: current.revision + 1,
      onboardingStatus: "not-started",
      onboardingStep: 0,
      steps: {},
      nextStep: "choose-path",
      onboardingCompletedAt: null,
      completedAt: null,
      lastVisitedAt: timestamp,
      updatedAt: timestamp,
      recentMutationIds: appendMutationId(current.recentMutationIds, input.mutationId),
    });
  }
  const requestedStatus = input.changes.onboardingStatus ?? current.onboardingStatus;
  assertOnboardingTransition(current.onboardingStatus, requestedStatus);
  const steps = input.changes.steps ? { ...current.steps, ...input.changes.steps } : current.steps;
  const nextStep = deriveNextActivationStep(steps);
  const completed = requestedStatus === "completed" || nextStep === "complete";
  return accountExperienceSchema.parse({
    ...current,
    ...input.changes,
    revision: current.revision + 1,
    steps,
    nextStep,
    onboardingStatus: completed ? "completed" : requestedStatus,
    onboardingCompletedAt: completed ? current.onboardingCompletedAt ?? timestamp : null,
    completedAt: completed ? current.completedAt ?? timestamp : null,
    lastVisitedAt: timestamp,
    updatedAt: timestamp,
    recentMutationIds: appendMutationId(current.recentMutationIds, input.mutationId),
  });
}

async function writeSampleMutationInTransaction({ db, input, mutationId, now, transaction, userId }: {
  db: Firestore;
  input: AccountExperiencePatch["sampleProgress"] & {};
  mutationId: string;
  now: Date;
  transaction: Transaction;
  userId: string;
}) {
  if (!input) return;
  const reference = sampleReference(db, userId, input.sampleId, input.sampleVersion);
  const snapshot = await transaction.get(reference);
  const current = snapshot.exists ? sampleCritiqueProgressSchema.parse(snapshot.data()) : null;
  if (current && current.userId !== userId) throw new ActivationNotFoundError();
  if (current?.recentMutationIds.includes(mutationId)) return;
  if (current) assertRevision(current.revision, input.expectedRevision);
  if (!current && input.expectedRevision !== null) throw new ActivationConflictError("Sample progress no longer exists.");
  const timestamp = now.toISOString();
  const complete = ownedSampleCatalog[input.sampleId].actionIds.every((id) => input.checkedActionIds.includes(id));
  transaction.set(reference, sampleCritiqueProgressSchema.parse({
    userId,
    schemaVersion: ACTIVATION_SCHEMA_VERSION,
    revision: current ? current.revision + 1 : 0,
    sampleId: input.sampleId,
    sampleVersion: input.sampleVersion,
    activeFindingId: input.activeFindingId,
    revealedFindingIds: input.revealedFindingIds,
    checkedActionIds: input.checkedActionIds,
    reflectionChoice: input.reflectionChoice,
    completedAt: complete ? current?.completedAt ?? timestamp : null,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
    recentMutationIds: appendMutationId(current?.recentMutationIds ?? [], mutationId),
  }));
}

async function mergeGuestProgressInTransaction({ db, guest, mutationId, now, transaction, userId }: {
  db: Firestore;
  guest: NonNullable<AccountExperiencePatch["guestProgress"]>;
  mutationId: string;
  now: Date;
  transaction: Transaction;
  userId: string;
}) {
  const reference = sampleReference(db, userId, guest.sampleId, guest.sampleVersion);
  const snapshot = await transaction.get(reference);
  const current = snapshot.exists ? sampleCritiqueProgressSchema.parse(snapshot.data()) : null;
  if (current && current.userId !== userId) throw new ActivationNotFoundError();
  if (current?.recentMutationIds.includes(mutationId)) return;
  const timestamp = now.toISOString();
  const base: SampleCritiqueProgress = current ?? sampleCritiqueProgressSchema.parse({
    userId,
    schemaVersion: ACTIVATION_SCHEMA_VERSION,
    revision: 0,
    sampleId: guest.sampleId,
    sampleVersion: guest.sampleVersion,
    activeFindingId: null,
    revealedFindingIds: [],
    checkedActionIds: [],
    reflectionChoice: null,
    completedAt: null,
    createdAt: timestamp,
    updatedAt: guest.createdAt,
    recentMutationIds: [],
  });
  const merged = mergeSampleProgress(base, guest, now);
  const complete = ownedSampleCatalog[guest.sampleId].actionIds.every((id) => merged.checkedActionIds.includes(id));
  transaction.set(reference, sampleCritiqueProgressSchema.parse({
    ...merged,
    revision: current ? current.revision + 1 : 0,
    completedAt: complete ? current?.completedAt ?? timestamp : null,
    updatedAt: timestamp,
    recentMutationIds: appendMutationId(current?.recentMutationIds ?? [], mutationId),
  }));
}

function sampleReference(db: Firestore, userId: string, sampleId: string, sampleVersion: string) {
  return db.collection(ACTIVATION_COLLECTIONS.sampleCritiqueProgress).doc(ownedDocumentId(userId, `${sampleId}_${sampleVersion}`));
}

function ownedDocumentId(userId: string, id: string) {
  return `${userId.length}_${userId}_${id}`;
}

function assertRevision(current: number, expected: number | null) {
  if (expected === null || current !== expected) throw new ActivationConflictError(undefined, current);
}

function assertOnboardingTransition(current: AccountExperience["onboardingStatus"], next: AccountExperience["onboardingStatus"]) {
  const allowed: Record<AccountExperience["onboardingStatus"], AccountExperience["onboardingStatus"][]> = {
    "not-started": ["not-started", "in-progress", "completed", "skipped"],
    "in-progress": ["in-progress", "completed", "skipped"],
    completed: ["completed"],
    skipped: ["skipped", "in-progress", "completed"],
  };
  if (!allowed[current].includes(next)) throw new ActivationConflictError("Onboarding cannot move to that state without an explicit restart.");
}

function assertSelfReviewTransition(current: SelfReviewSession["status"], next: SelfReviewSession["status"]) {
  if (current === "archived" && next !== "archived") throw new ActivationConflictError("Archived self-reviews cannot be reopened.");
  if (current === "completed" && next === "draft") throw new ActivationConflictError("Completed self-reviews cannot return to draft.");
}

function assertBriefTransition(current: DesignBriefDraft["status"], next: DesignBriefDraft["status"]) {
  const allowed: Record<DesignBriefDraft["status"], DesignBriefDraft["status"][]> = {
    draft: ["draft", "ready", "archived"],
    ready: ["ready", "draft", "consumed", "archived"],
    consumed: ["consumed", "archived"],
    archived: ["archived"],
  };
  if (!allowed[current].includes(next)) throw new ActivationConflictError("The design brief cannot move to that state.");
}

async function deleteOwnedQuery(db: Firestore, collectionName: string, userId: string) {
  return deleteMatchingQuery(db, collectionName, "userId", userId);
}

async function deleteAccessDecisionAuditForUser(db: Firestore, userId: string) {
  const targetDeleted = await deleteMatchingQuery(db, ACTIVATION_COLLECTIONS.reviewAccessDecisionAudit, "targetUserId", userId);
  const actorDeleted = await deleteMatchingQuery(db, ACTIVATION_COLLECTIONS.reviewAccessDecisionAudit, "actorUserId", userId);
  return targetDeleted + actorDeleted;
}

async function deleteMatchingQuery(db: Firestore, collectionName: string, field: string, value: string) {
  let deleted = 0;
  while (true) {
    const snapshot = await db.collection(collectionName).where(field, "==", value).limit(400).get();
    if (snapshot.empty) return deleted;
    await deleteReferences(db, snapshot.docs.map((document) => document.ref));
    deleted += snapshot.size;
  }
}

async function deleteExactDocument(db: Firestore, collectionName: string, documentId: string) {
  const reference = db.collection(collectionName).doc(documentId);
  const snapshot = await reference.get();
  if (snapshot.exists) await reference.delete();
  return snapshot.exists ? 1 : 0;
}

async function deleteReferences(db: Firestore, references: DocumentReference[]) {
  for (let offset = 0; offset < references.length; offset += 400) {
    const batch = db.batch();
    references.slice(offset, offset + 400).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
}

function createDeleteResult(): ActivationDeleteResult {
  return { accountExperiencesDeleted: 0, briefsDeleted: 0, decisionAuditDeleted: 0, interestsDeleted: 0, sampleProgressDeleted: 0, selfReviewsDeleted: 0, failures: [], status: "complete" };
}

function settledCount(result: PromiseSettledResult<number>) {
  return result.status === "fulfilled" ? result.value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function reviewCategoriesIncludes(value: unknown): value is DesignBriefPut["category"] {
  return typeof value === "string" && ["logo", "poster", "social", "ui", "website", "book-cover", "packaging", "other"].includes(value);
}

function feedbackModeIncludes(value: unknown): value is DesignBriefPut["mode"] {
  return value === "friendly" || value === "mentor" || value === "direct";
}
