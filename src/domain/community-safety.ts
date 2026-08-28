import { z } from "zod";

export const communitySafetyContractVersion = 1 as const;

export const communityPublicProjectionSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  postId: z.string().min(1).max(320),
  publicAuthor: z.strictObject({
    displayName: z.string().min(1).max(80),
    avatarUrl: z.url().max(2_000).refine((value) => new URL(value).protocol === "https:", {
      message: "Community avatars must use HTTPS.",
    }).optional(),
  }),
  title: z.string().min(3).max(120),
  note: z.string().max(420).optional(),
  category: z.string().min(1).max(80),
  critiqueExcerpt: z.string().min(1).max(600),
  stats: z.strictObject({ comments: z.number().int().nonnegative(), likes: z.number().int().nonnegative(), saves: z.number().int().nonnegative() }),
  publishedAt: z.iso.datetime({ offset: true }),
  consent: z.strictObject({
    version: z.literal("community-consent-v1"),
    grantedAt: z.iso.datetime({ offset: true }),
    withdrawalState: z.literal("active"),
  }),
});

const communityIdSchema = z.string().regex(/^[A-Za-z0-9_.-]+$/).max(320);
const isoDateSchema = z.iso.datetime({ offset: true });

export const communityStoredProjectionSchema = communityPublicProjectionSchema.extend({
  ownerId: z.string().min(1).max(128),
  sourceReviewId: communityIdSchema,
  visibility: z.enum(["public", "hidden", "deleted"]),
  moderationState: z.enum(["clear", "reported", "removed"]),
  moderationActionId: communityIdSchema.nullable(),
  updatedAt: isoDateSchema,
}).strict();

export const communityProjectionViewSchema = z.strictObject({
  projection: communityPublicProjectionSchema,
  viewer: z.strictObject({
    liked: z.boolean(),
    owned: z.boolean(),
    saved: z.boolean(),
    shared: z.boolean(),
  }),
});

export const communityPublicCommentSchema = z.strictObject({
  id: communityIdSchema,
  postId: communityIdSchema,
  authorName: z.string().min(1).max(80),
  body: z.string().trim().min(2).max(500),
  createdAt: isoDateSchema,
});

export const communityConsentSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  id: communityIdSchema,
  userId: z.string().min(1).max(128),
  sourceReviewId: communityIdSchema,
  projectionId: communityIdSchema,
  consentVersion: z.literal("community-consent-v1"),
  state: z.enum(["active", "withdrawn"]),
  grantedAt: isoDateSchema,
  withdrawnAt: isoDateSchema.nullable(),
  derivativeState: z.enum(["active", "deletion-pending", "deleted"]),
  updatedAt: isoDateSchema,
});

export const communityCommentRecordSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  id: communityIdSchema,
  postId: communityIdSchema,
  authorId: z.string().min(1).max(128),
  authorName: z.string().min(1).max(80),
  authorDeletedAt: isoDateSchema.nullable(),
  body: z.string().trim().min(2).max(500),
  status: z.enum(["visible", "deleted", "removed"]),
  moderationState: z.enum(["clear", "reported", "removed"]),
  moderationActionId: communityIdSchema.nullable(),
  cursorKey: z.string().min(1).max(160),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const communityInteractionRecordSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  id: z.string().min(1).max(700),
  postId: communityIdSchema,
  userId: z.string().min(1).max(128),
  type: z.enum(["liked", "saved", "shared"]),
  active: z.boolean(),
  updatedAt: isoDateSchema,
});

export const communityReportSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  targetType: z.enum(["post", "comment", "account"]),
  targetId: z.string().min(1).max(320),
  reason: z.enum(["harassment", "hate", "spam", "privacy", "copyright", "self-harm", "other"]),
  details: z.string().trim().max(800).optional(),
});

export const communityReportRecordSchema = communityReportSchema.extend({
  id: communityIdSchema,
  reporterId: z.string().min(1).max(128),
  deduplicationKey: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["queued", "reviewing", "resolved", "dismissed"]),
  resolutionActionId: communityIdSchema.nullable(),
  resolverId: z.string().min(1).max(128).nullable(),
  queueEnteredAt: isoDateSchema,
  updatedAt: isoDateSchema,
}).strict();

export const communityBlockSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  id: z.string().regex(/^[a-f0-9]{64}$/),
  blockerId: z.string().min(1).max(128),
  blockedId: z.string().min(1).max(128),
  createdAt: isoDateSchema,
});

export const communityModerationActionSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  action: z.enum(["remove", "restore", "warn", "restrict", "ban", "appeal-uphold", "appeal-reverse"]),
  targetType: z.enum(["post", "comment", "account"]),
  targetId: z.string().min(1).max(320),
  reasonCode: z.string().min(1).max(80),
  auditEventId: z.string().min(1).max(200),
});

export const communityModerationActionRecordSchema = communityModerationActionSchema.extend({
  id: communityIdSchema,
  moderatorId: z.string().min(1).max(128),
  reversalOfActionId: communityIdSchema.nullable(),
  createdAt: isoDateSchema,
}).strict();

export const communityAccountModerationSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  accountId: z.string().min(1).max(128),
  state: z.enum(["clear", "warned", "restricted", "banned"]),
  actionId: communityIdSchema,
  updatedAt: isoDateSchema,
});

export const communityAppealSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  id: communityIdSchema,
  actionId: communityIdSchema,
  appellantId: z.string().min(1).max(128),
  reason: z.string().trim().min(3).max(1_000),
  status: z.enum(["queued", "upheld", "reversed"]),
  originalModeratorId: z.string().min(1).max(128),
  reviewerId: z.string().min(1).max(128).nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
}).refine((appeal) => appeal.reviewerId === null || appeal.reviewerId !== appeal.originalModeratorId, {
  message: "Appeals require an independent reviewer.",
  path: ["reviewerId"],
});

export const communityAuditSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  id: z.uuid(),
  action: z.string().min(1).max(80),
  actorRole: z.enum(["user", "moderator", "system"]),
  actorHash: z.string().regex(/^[a-f0-9]{64}$/),
  targetType: z.enum(["post", "comment", "account", "report", "appeal"]),
  targetIdHash: z.string().regex(/^[a-f0-9]{64}$/),
  reasonCode: z.string().min(1).max(80),
  createdAt: isoDateSchema,
});

export const communityOutboxSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  id: z.uuid(),
  eventType: z.enum(["hide-projection", "delete-derivatives", "repair-counters"]),
  targetId: communityIdSchema,
  state: z.enum(["pending", "leased", "delivered", "failed"]),
  attempt: z.number().int().min(0).max(12),
  nextAttemptAt: isoDateSchema,
  leaseOwner: z.string().min(1).max(128).nullable(),
  leaseExpiresAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const communityCounterShardSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  postId: communityIdSchema,
  shard: z.number().int().min(0).max(31),
  comments: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  updatedAt: isoDateSchema,
});

const communityGateEvidenceSchema = z.strictObject({
  publicProjection: z.boolean(),
  explicitConsent: z.boolean(),
  authorEditDelete: z.boolean(),
  commentDelete: z.boolean(),
  reporting: z.boolean(),
  blocking: z.boolean(),
  moderatorRemoval: z.boolean(),
  appeals: z.boolean(),
  auditLog: z.boolean(),
  abuseLimits: z.boolean(),
  deletionPropagation: z.boolean(),
  counterIntegrity: z.boolean(),
  incidentRunbook: z.boolean(),
  loadTest: z.boolean(),
  endToEndTests: z.boolean(),
  retentionEvidence: z.boolean(),
});

export const communityLaunchDecisionSchema = z.strictObject({
  evidence: communityGateEvidenceSchema,
  moderationOwnerRole: z.string().min(1).max(120).nullable(),
  productApproval: z.boolean(),
  safetyApproval: z.boolean(),
});

export function evaluateCommunityLaunch(input: unknown) {
  const decision = communityLaunchDecisionSchema.parse(input);
  const missing = Object.entries(decision.evidence)
    .filter(([, complete]) => !complete)
    .map(([gate]) => gate);
  if (!decision.moderationOwnerRole) missing.push("moderationOwnerRole");
  if (!decision.productApproval) missing.push("productApproval");
  if (!decision.safetyApproval) missing.push("safetyApproval");
  return { launchable: missing.length === 0, missing } as const;
}

export type CommunityPublicProjection = z.infer<typeof communityPublicProjectionSchema>;
