import { z } from "zod";
import { feedbackModes, reviewCategories } from "./review";

export const ACTIVATION_SCHEMA_VERSION = 1 as const;
export const ACTIVATION_PROGRAM_VERSION = "free-activation-v1" as const;
export const DESIGN_BRIEF_FLOW_VERSION = "brief-v1" as const;
export const SELF_REVIEW_RUBRIC_VERSION = "rubric-v1" as const;
export const GUEST_PROGRESS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_RECENT_MUTATION_IDS = 20;

export const activationRoles = ["beginner-designer", "freelancer", "ui-ux-designer", "other"] as const;
export const activationGoals = ["learn-principles", "pre-client-check", "improve-ui", "build-portfolio", "other"] as const;
export const onboardingStatuses = ["not-started", "in-progress", "completed", "skipped"] as const;
export const activationStepIds = ["choose-path", "inspect-sample", "practice-rubric", "prepare-brief", "request-access"] as const;
export const activationNextSteps = [...activationStepIds, "complete"] as const;
export const allowedHintIds = ["sample-evidence", "rubric-priority", "brief-context", "access-gate"] as const;
export const sampleReflectionChoices = ["needs-practice", "ready-to-apply", "not-sure"] as const;
export const selfReviewAnswers = ["yes", "no", "unsure", "not-applicable"] as const;
export const selfReviewStatuses = ["draft", "completed", "archived"] as const;
export const briefStatuses = ["draft", "ready", "consumed", "archived"] as const;
export const accessInterestStatuses = ["interested", "invited", "declined", "expired", "revoked"] as const;
export const clientWorkIntents = ["personal-only", "client-safe-only", "unsure"] as const;
export const accessDecisions = ["approve", "decline", "expire", "revoke"] as const;
export const accessDecisionReasonCodes = ["cohort-fit", "capacity", "safety-review", "expired", "user-request", "operator-revocation"] as const;

export const ownedSampleCatalog = Object.freeze({
  "form-together-friendly": Object.freeze({
    version: "v1",
    findingIds: Object.freeze(["finding-1", "finding-2", "finding-3"]),
    actionIds: Object.freeze(["action-1", "action-2", "action-3"]),
  }),
  "fieldnote-mentor": Object.freeze({
    version: "v1",
    findingIds: Object.freeze(["finding-1", "finding-2", "finding-3"]),
    actionIds: Object.freeze(["action-1", "action-2", "action-3"]),
  }),
  "signal-noise-direct": Object.freeze({
    version: "v1",
    findingIds: Object.freeze(["finding-1", "finding-2", "finding-3"]),
    actionIds: Object.freeze(["action-1", "action-2", "action-3"]),
  }),
});

export const ownedSampleIds = Object.keys(ownedSampleCatalog) as [OwnedSampleId, ...OwnedSampleId[]];

export const rubricItemIdsByCategory = Object.freeze({
  logo: Object.freeze(["logo-distinctiveness", "logo-legibility", "logo-scalability", "logo-consistency"]),
  poster: Object.freeze(["poster-hierarchy", "poster-legibility", "poster-contrast", "poster-spacing"]),
  social: Object.freeze(["social-hook", "social-legibility", "social-brand", "social-action"]),
  ui: Object.freeze(["ui-hierarchy", "ui-clarity", "ui-consistency", "ui-accessibility"]),
  website: Object.freeze(["website-hierarchy", "website-navigation", "website-readability", "website-action"]),
  "book-cover": Object.freeze(["cover-title", "cover-genre", "cover-thumbnail", "cover-contrast"]),
  packaging: Object.freeze(["packaging-hierarchy", "packaging-legibility", "packaging-shelf", "packaging-trust"]),
  other: Object.freeze(["other-hierarchy", "other-clarity", "other-consistency", "other-purpose"]),
});

type OwnedSampleId = keyof typeof ownedSampleCatalog;
export type ReviewCategory = (typeof reviewCategories)[number];
type SelfReviewAnswer = (typeof selfReviewAnswers)[number];

const opaqueIdSchema = z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const mutationIdSchema = z.string().trim().min(8).max(100).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const versionLabelSchema = z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const isoTimestampSchema = z.string().datetime({ offset: true });
const optionalBoundedText = (max: number) => z.string().trim().max(max);

const activationStepStateSchema = z.object({
  completed: z.boolean(),
  completedAt: isoTimestampSchema.nullable(),
}).strict();

export const activationStepsSchema = z.object({
  "choose-path": activationStepStateSchema.optional(),
  "inspect-sample": activationStepStateSchema.optional(),
  "practice-rubric": activationStepStateSchema.optional(),
  "prepare-brief": activationStepStateSchema.optional(),
  "request-access": activationStepStateSchema.optional(),
}).strict();

export const accountExperienceSchema = z.object({
  userId: z.string().min(1).max(128),
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  primaryRole: z.enum(activationRoles).nullable(),
  primaryGoal: z.enum(activationGoals).nullable(),
  preferredMode: z.enum(feedbackModes),
  selectedCategories: uniqueArray(z.enum(reviewCategories), 5),
  onboardingStatus: z.enum(onboardingStatuses),
  onboardingStep: z.number().int().min(0).max(3),
  programVersion: z.literal(ACTIVATION_PROGRAM_VERSION),
  steps: activationStepsSchema,
  nextStep: z.enum(activationNextSteps),
  dismissedHints: uniqueArray(z.enum(allowedHintIds), allowedHintIds.length),
  onboardingCompletedAt: isoTimestampSchema.nullable(),
  lastVisitedAt: isoTimestampSchema,
  completedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  recentMutationIds: uniqueArray(mutationIdSchema, MAX_RECENT_MUTATION_IDS),
}).strict();

const accountExperienceChangesSchema = z.object({
  primaryRole: z.enum(activationRoles).nullable().optional(),
  primaryGoal: z.enum(activationGoals).nullable().optional(),
  preferredMode: z.enum(feedbackModes).optional(),
  selectedCategories: uniqueArray(z.enum(reviewCategories), 5).optional(),
  onboardingStatus: z.enum(onboardingStatuses).optional(),
  onboardingStep: z.number().int().min(0).max(3).optional(),
  steps: activationStepsSchema.optional(),
  dismissedHints: uniqueArray(z.enum(allowedHintIds), allowedHintIds.length).optional(),
}).strict();

export const accountExperiencePatchSchema = z.object({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  expectedRevision: z.number().int().nonnegative(),
  mutationId: mutationIdSchema,
  action: z.enum(["update", "reset-onboarding", "clear-onboarding", "import-legacy"]).default("update"),
  changes: accountExperienceChangesSchema,
  sampleProgress: z.lazy(() => sampleProgressMutationSchema).optional(),
  guestProgress: z.lazy(() => guestSampleProgressSchema).optional(),
}).strict().refine((value) => value.action !== "update" || Object.keys(value.changes).length > 0 || value.sampleProgress || value.guestProgress, {
  message: "At least one bounded experience change is required.",
});

const sampleIdSchema = z.enum(ownedSampleIds);

const sampleProgressCoreSchema = z.object({
  sampleId: sampleIdSchema,
  sampleVersion: z.literal("v1"),
  activeFindingId: opaqueIdSchema.nullable(),
  revealedFindingIds: uniqueArray(opaqueIdSchema, 12),
  checkedActionIds: uniqueArray(opaqueIdSchema, 12),
  reflectionChoice: z.enum(sampleReflectionChoices).nullable(),
}).strict().superRefine(validateSampleProgressIds);

export const guestSampleProgressSchema = sampleProgressCoreSchema.extend({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
}).strict();

export const sampleProgressMutationSchema = sampleProgressCoreSchema.extend({
  expectedRevision: z.number().int().nonnegative().nullable(),
}).strict();

export const sampleCritiqueProgressSchema = sampleProgressCoreSchema.extend({
  userId: z.string().min(1).max(128),
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  completedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  recentMutationIds: uniqueArray(mutationIdSchema, MAX_RECENT_MUTATION_IDS),
}).strict();

const selfReviewResponseSchema = z.object({
  itemId: opaqueIdSchema,
  answer: z.enum(selfReviewAnswers),
}).strict();

export const selfReviewCreateSchema = z.object({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  id: opaqueIdSchema,
  mutationId: mutationIdSchema,
  rubricVersion: z.literal(SELF_REVIEW_RUBRIC_VERSION),
  category: z.enum(reviewCategories),
  projectId: z.uuid().nullable().default(null),
  goalLabel: optionalBoundedText(120).default(""),
  responses: uniqueObjectArray(selfReviewResponseSchema, "itemId", 20).default([]),
}).strict().superRefine(validateSelfReviewItems);

export const selfReviewPatchSchema = z.object({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  id: opaqueIdSchema,
  expectedRevision: z.number().int().nonnegative(),
  mutationId: mutationIdSchema,
  changes: z.object({
    projectId: z.uuid().nullable().optional(),
    goalLabel: optionalBoundedText(120).optional(),
    responses: uniqueObjectArray(selfReviewResponseSchema, "itemId", 20).optional(),
    status: z.enum(selfReviewStatuses).optional(),
  }).strict(),
}).strict().refine((value) => Object.keys(value.changes).length > 0, { message: "At least one self-review change is required." })
  .superRefine((value, context) => {
    if (value.changes.responses) validateSelfReviewItems({ category: "other", responses: value.changes.responses }, context, true);
  });

export const selfReviewSessionSchema = z.object({
  id: opaqueIdSchema,
  userId: z.string().min(1).max(128),
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  rubricVersion: z.literal(SELF_REVIEW_RUBRIC_VERSION),
  category: z.enum(reviewCategories),
  projectId: z.uuid().nullable().default(null),
  goalLabel: optionalBoundedText(120),
  responses: uniqueObjectArray(selfReviewResponseSchema, "itemId", 20),
  priorityItemIds: uniqueArray(opaqueIdSchema, 3),
  status: z.enum(selfReviewStatuses),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  recentMutationIds: uniqueArray(mutationIdSchema, MAX_RECENT_MUTATION_IDS),
}).strict().superRefine(validateSelfReviewItems);

const designBriefFields = {
  projectId: z.uuid().nullable().default(null),
  category: z.enum(reviewCategories).nullable(),
  audience: optionalBoundedText(240),
  purpose: optionalBoundedText(400),
  style: optionalBoundedText(240),
  goal: optionalBoundedText(240),
  concern: optionalBoundedText(400),
  constraints: optionalBoundedText(400),
  mode: z.enum(feedbackModes),
  step: z.number().int().min(1).max(4),
  flowVersion: z.literal(DESIGN_BRIEF_FLOW_VERSION),
  status: z.enum(briefStatuses),
} as const;

export const designBriefPutSchema = z.object({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  id: opaqueIdSchema,
  expectedRevision: z.number().int().nonnegative().nullable(),
  mutationId: mutationIdSchema,
  ...designBriefFields,
}).strict();

export const designBriefDraftSchema = z.object({
  id: opaqueIdSchema,
  userId: z.string().min(1).max(128),
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  ...designBriefFields,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  recentMutationIds: uniqueArray(mutationIdSchema, MAX_RECENT_MUTATION_IDS),
  importedFromLegacy: z.boolean(),
}).strict();

export const accessInterestCreateSchema = z.object({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  programVersion: versionLabelSchema,
  expectedRevision: z.number().int().nonnegative().nullable(),
  mutationId: mutationIdSchema,
  preferredCategory: z.enum(reviewCategories).nullable(),
  clientWorkIntent: z.enum(clientWorkIntents),
  contactPermission: z.boolean(),
}).strict();

export const accessInterestRevokeSchema = z.object({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  programVersion: versionLabelSchema,
  mutationId: mutationIdSchema,
  expectedRevision: z.number().int().nonnegative().nullable(),
}).strict();

export const reviewAccessInterestSchema = z.object({
  userId: z.string().min(1).max(128),
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  programVersion: versionLabelSchema,
  cohort: z.enum(activationRoles),
  preferredCategory: z.enum(reviewCategories).nullable(),
  clientWorkIntent: z.enum(clientWorkIntents),
  contactPermission: z.boolean(),
  status: z.enum(accessInterestStatuses),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  recentMutationIds: uniqueArray(mutationIdSchema, MAX_RECENT_MUTATION_IDS),
}).strict();

export const reviewAccessDecisionAuditSchema = z.object({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  eventId: mutationIdSchema,
  targetUserId: z.string().min(1).max(128),
  actorUserId: z.string().min(1).max(128),
  programVersion: versionLabelSchema,
  decision: z.enum(accessDecisions),
  reasonCode: z.enum(accessDecisionReasonCodes),
  previousStatus: z.enum(accessInterestStatuses),
  nextStatus: z.enum(accessInterestStatuses),
  createdAt: isoTimestampSchema,
}).strict().refine((value) => value.actorUserId !== value.targetUserId, { message: "Operators cannot decide their own access." });

export const activationDeleteSchema = z.object({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  scope: z.literal("learning-history"),
}).strict();

export const selfReviewDeleteSchema = z.union([
  z.object({
    schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
    mutationId: mutationIdSchema,
    id: opaqueIdSchema,
  }).strict(),
  z.object({
    schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
    mutationId: mutationIdSchema,
    scope: z.literal("all"),
  }).strict(),
]);

export const designBriefDeleteSchema = z.object({
  schemaVersion: z.literal(ACTIVATION_SCHEMA_VERSION),
  mutationId: mutationIdSchema,
  id: opaqueIdSchema,
}).strict();

export const activationRecordIdSchema = opaqueIdSchema;

export function createDefaultAccountExperience(userId: string, now = new Date()) {
  const timestamp = now.toISOString();
  return accountExperienceSchema.parse({
    userId,
    schemaVersion: ACTIVATION_SCHEMA_VERSION,
    revision: 0,
    primaryRole: null,
    primaryGoal: null,
    preferredMode: "mentor",
    selectedCategories: [],
    onboardingStatus: "not-started",
    onboardingStep: 0,
    programVersion: ACTIVATION_PROGRAM_VERSION,
    steps: {},
    nextStep: "choose-path",
    dismissedHints: [],
    onboardingCompletedAt: null,
    lastVisitedAt: timestamp,
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    recentMutationIds: [],
  });
}

export function deriveNextActivationStep(steps: z.infer<typeof activationStepsSchema>) {
  return activationStepIds.find((step) => !steps[step]?.completed) ?? "complete";
}

export function derivePriorityItemIds(category: ReviewCategory, responses: Array<{ itemId: string; answer: SelfReviewAnswer }>) {
  const allowed = new Set(rubricItemIdsByCategory[category]);
  return responses
    .filter((response) => allowed.has(response.itemId as never) && (response.answer === "no" || response.answer === "unsure"))
    .slice(0, 3)
    .map((response) => response.itemId);
}

type MergeProgress = {
  sampleId: OwnedSampleId;
  sampleVersion: "v1";
  activeFindingId: string | null;
  revealedFindingIds: string[];
  checkedActionIds: string[];
  reflectionChoice: (typeof sampleReflectionChoices)[number] | null;
  completedAt: string | null;
  updatedAt: string;
};

export function mergeSampleProgress<T extends MergeProgress>(
  current: T,
  guest: z.infer<typeof guestSampleProgressSchema>,
  now = new Date(),
): T {
  if (guest.sampleId !== current.sampleId || guest.sampleVersion !== current.sampleVersion || isGuestProgressExpired(guest, now)) return current;
  const guestIsNewer = Date.parse(guest.updatedAt) > Date.parse(current.updatedAt);
  return {
    ...current,
    activeFindingId: guestIsNewer ? guest.activeFindingId : current.activeFindingId,
    revealedFindingIds: unionBounded(current.revealedFindingIds, guest.revealedFindingIds, 12),
    checkedActionIds: unionBounded(current.checkedActionIds, guest.checkedActionIds, 12),
    reflectionChoice: guestIsNewer ? guest.reflectionChoice : current.reflectionChoice,
    updatedAt: guestIsNewer ? guest.updatedAt : current.updatedAt,
  };
}

export function isGuestProgressExpired(progress: z.infer<typeof guestSampleProgressSchema>, now = new Date()) {
  const createdAt = Date.parse(progress.createdAt);
  const updatedAt = Date.parse(progress.updatedAt);
  return !Number.isFinite(createdAt)
    || !Number.isFinite(updatedAt)
    || updatedAt < createdAt
    || createdAt > now.getTime() + 5 * 60 * 1000
    || now.getTime() - updatedAt > GUEST_PROGRESS_MAX_AGE_MS;
}

export function appendMutationId(ids: string[], mutationId: string) {
  return [...ids.filter((id) => id !== mutationId), mutationId].slice(-MAX_RECENT_MUTATION_IDS);
}

function validateSampleProgressIds(value: {
  sampleId: OwnedSampleId;
  sampleVersion: "v1";
  activeFindingId: string | null;
  revealedFindingIds: string[];
  checkedActionIds: string[];
}, context: z.RefinementCtx) {
  const sample = ownedSampleCatalog[value.sampleId];
  if (sample.version !== value.sampleVersion) addIssue(context, ["sampleVersion"], "Unsupported sample version.");
  const findings = new Set<string>(sample.findingIds);
  const actions = new Set<string>(sample.actionIds);
  if (value.activeFindingId && !findings.has(value.activeFindingId)) addIssue(context, ["activeFindingId"], "Finding is not part of this sample.");
  value.revealedFindingIds.forEach((id, index) => {
    if (!findings.has(id)) addIssue(context, ["revealedFindingIds", index], "Finding is not part of this sample.");
  });
  value.checkedActionIds.forEach((id, index) => {
    if (!actions.has(id)) addIssue(context, ["checkedActionIds", index], "Action is not part of this sample.");
  });
}

function validateSelfReviewItems(
  value: { category: ReviewCategory; responses: Array<{ itemId: string }> },
  context: z.RefinementCtx,
  allowAnyCategory = false,
) {
  const allowed = allowAnyCategory
    ? new Set(Object.values(rubricItemIdsByCategory).flat())
    : new Set<string>(rubricItemIdsByCategory[value.category]);
  value.responses.forEach((response, index) => {
    if (!allowed.has(response.itemId)) addIssue(context, ["responses", index, "itemId"], "Rubric item is not supported.");
  });
}

function uniqueArray<T extends z.ZodType>(schema: T, max: number) {
  return z.array(schema).max(max).superRefine((values, context) => {
    if (new Set(values.map(String)).size !== values.length) addIssue(context, [], "Values must be unique.");
  });
}

function uniqueObjectArray<T extends z.ZodObject, K extends string>(schema: T, key: K, max: number) {
  return z.array(schema).max(max).superRefine((values, context) => {
    const keys = values.map((value) => String((value as Record<string, unknown>)[key]));
    if (new Set(keys).size !== keys.length) addIssue(context, [], `${key} values must be unique.`);
  });
}

function addIssue(context: z.RefinementCtx, path: PropertyKey[], message: string) {
  context.addIssue({ code: "custom", path, message });
}

function unionBounded(current: string[], incoming: string[], max: number) {
  return Array.from(new Set([...current, ...incoming])).slice(0, max);
}

export type AccountExperience = z.infer<typeof accountExperienceSchema>;
export type AccountExperiencePatch = z.infer<typeof accountExperiencePatchSchema>;
export type GuestSampleProgress = z.infer<typeof guestSampleProgressSchema>;
export type SampleCritiqueProgress = z.infer<typeof sampleCritiqueProgressSchema>;
export type SampleProgressMutation = z.infer<typeof sampleProgressMutationSchema>;
export type SelfReviewCreate = z.input<typeof selfReviewCreateSchema>;
export type SelfReviewPatch = z.infer<typeof selfReviewPatchSchema>;
export type SelfReviewSession = z.infer<typeof selfReviewSessionSchema>;
export type DesignBriefPut = z.input<typeof designBriefPutSchema>;
export type DesignBriefDraft = z.infer<typeof designBriefDraftSchema>;
export type AccessInterestCreate = z.infer<typeof accessInterestCreateSchema>;
export type AccessInterestRevoke = z.infer<typeof accessInterestRevokeSchema>;
export type ReviewAccessInterest = z.infer<typeof reviewAccessInterestSchema>;
export type ReviewAccessDecisionAudit = z.infer<typeof reviewAccessDecisionAuditSchema>;
