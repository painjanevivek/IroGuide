import { z } from "zod";

export const communitySafetyContractVersion = 1 as const;

export const communityPublicProjectionSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  postId: z.string().min(1).max(320),
  publicAuthor: z.strictObject({
    displayName: z.string().min(1).max(80),
    avatarUrl: z.url().max(2_000).optional(),
  }),
  title: z.string().min(3).max(120),
  note: z.string().max(420).optional(),
  category: z.string().min(1).max(80),
  critiqueExcerpt: z.string().min(1).max(600),
  publishedAt: z.iso.datetime({ offset: true }),
  consent: z.strictObject({
    version: z.literal("community-consent-v1"),
    grantedAt: z.iso.datetime({ offset: true }),
    withdrawalState: z.literal("active"),
  }),
});

export const communityReportSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  targetType: z.enum(["post", "comment", "account"]),
  targetId: z.string().min(1).max(320),
  reason: z.enum(["harassment", "hate", "spam", "privacy", "copyright", "self-harm", "other"]),
  details: z.string().trim().max(800).optional(),
});

export const communityModerationActionSchema = z.strictObject({
  schemaVersion: z.literal(communitySafetyContractVersion),
  action: z.enum(["remove", "restore", "warn", "restrict", "ban", "appeal-uphold", "appeal-reverse"]),
  targetType: z.enum(["post", "comment", "account"]),
  targetId: z.string().min(1).max(320),
  reasonCode: z.string().min(1).max(80),
  auditEventId: z.string().min(1).max(200),
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
