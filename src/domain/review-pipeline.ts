import { z } from "zod";
import { feedbackModes, reviewBriefSchema, reviewCategories } from "./review";

export const reviewPipelineContractVersion = 1 as const;
export const reviewUploadStates = ["authorized", "uploaded", "validated", "consumed", "expired", "rejected"] as const;
export const reviewJobStates = ["accepted", "running", "succeeded", "failed-retryable", "failed-permanent", "cancelled"] as const;
export const reviewFailureClasses = ["deadline", "rate-limit", "provider-unavailable", "invalid-output", "policy", "cancelled", "result-save"] as const;

const isoDateSchema = z.iso.datetime({ offset: true });
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const reviewUploadValidationSchema = z.strictObject({
  bytes: z.number().int().positive().max(4 * 1024 * 1024),
  contentDigest: sha256Schema,
  detectedFormat: z.enum(["jpeg", "png", "webp"]),
  height: z.number().int().positive().max(8_192),
  pixelCount: z.number().int().positive().max(24_000_000),
  validatedAt: isoDateSchema,
  validatorVersion: z.literal("sharp-v1"),
  width: z.number().int().positive().max(8_192),
});

export const reviewUploadSessionSchema = z.strictObject({
  schemaVersion: z.literal(reviewPipelineContractVersion),
  id: z.uuid(),
  userId: z.string().min(1).max(128),
  storagePath: z.string().min(1).max(700),
  state: z.enum(reviewUploadStates),
  maxBytes: z.literal(4 * 1024 * 1024),
  expectedContentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  issuedAt: isoDateSchema,
  expiresAt: isoDateSchema,
  nonce: sha256Schema,
  contentDigest: sha256Schema.nullable(),
  validation: reviewUploadValidationSchema.nullable(),
  failureClass: z.enum(["expired", "invalid-image", "missing-object", "revoked"]).nullable(),
  updatedAt: isoDateSchema,
});

export const reviewJobAttemptSchema = z.strictObject({
  attempt: z.number().int().min(1).max(3),
  finishedAt: isoDateSchema.nullable(),
  leaseExpiresAt: isoDateSchema,
  startedAt: isoDateSchema,
  failureClass: z.enum(reviewFailureClasses).nullable(),
  workerId: z.string().min(1).max(128),
});

export const reviewJobSchema = z.strictObject({
  schemaVersion: z.literal(reviewPipelineContractVersion),
  id: z.uuid(),
  userId: z.string().min(1).max(128),
  uploadSessionId: z.uuid(),
  idempotencyKey: z.string().min(16).max(128),
  requestDigest: sha256Schema,
  status: z.enum(reviewJobStates),
  attempt: z.number().int().min(0).max(3),
  attempts: z.array(reviewJobAttemptSchema).max(3),
  category: z.enum(reviewCategories),
  mode: z.enum(feedbackModes),
  brief: reviewBriefSchema,
  provider: z.string().min(1).max(80),
  model: z.string().min(1).max(160),
  providerContractVersion: z.string().min(1).max(80),
  rubricVersion: z.string().min(1).max(80),
  deadlineAt: isoDateSchema,
  resultDocumentId: z.string().min(1).max(700).nullable(),
  failureClass: z.enum(reviewFailureClasses).nullable(),
  leaseOwner: z.string().min(1).max(128).nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const reviewJobOutboxSchema = z.strictObject({
  schemaVersion: z.literal(reviewPipelineContractVersion),
  id: z.uuid(),
  userId: z.string().min(1).max(128),
  targetId: z.uuid(),
  eventType: z.enum(["validate-upload", "run-review", "reconcile-upload", "reconcile-job"]),
  deliveryState: z.enum(["pending", "leased", "delivered", "failed"]),
  attemptCount: z.number().int().min(0).max(12),
  nextAttemptAt: isoDateSchema,
  leaseOwner: z.string().min(1).max(128).nullable(),
  leaseExpiresAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const createReviewUploadRequestSchema = z.strictObject({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const createReviewJobRequestSchema = z.strictObject({
  uploadSessionId: z.uuid(),
  idempotencyKey: z.string().min(16).max(128),
  category: z.enum(reviewCategories),
  mode: z.enum(feedbackModes),
  brief: reviewBriefSchema,
});

const uploadTransitions: Record<(typeof reviewUploadStates)[number], ReadonlySet<(typeof reviewUploadStates)[number]>> = {
  authorized: new Set(["uploaded", "expired", "rejected"]),
  uploaded: new Set(["validated", "expired", "rejected"]),
  validated: new Set(["consumed", "expired", "rejected"]),
  consumed: new Set(),
  expired: new Set(),
  rejected: new Set(),
};

const jobTransitions: Record<(typeof reviewJobStates)[number], ReadonlySet<(typeof reviewJobStates)[number]>> = {
  accepted: new Set(["running", "cancelled", "failed-permanent"]),
  running: new Set(["succeeded", "failed-retryable", "failed-permanent", "cancelled"]),
  "failed-retryable": new Set(["running", "failed-permanent", "cancelled"]),
  succeeded: new Set(),
  "failed-permanent": new Set(),
  cancelled: new Set(),
};

export function canTransitionReviewUpload(from: (typeof reviewUploadStates)[number], to: (typeof reviewUploadStates)[number]) {
  return uploadTransitions[from].has(to);
}

export function canTransitionReviewJob(from: (typeof reviewJobStates)[number], to: (typeof reviewJobStates)[number]) {
  return jobTransitions[from].has(to);
}

export type ReviewUploadSession = z.infer<typeof reviewUploadSessionSchema>;
export type ReviewJob = z.infer<typeof reviewJobSchema>;
export type ReviewJobOutbox = z.infer<typeof reviewJobOutboxSchema>;
