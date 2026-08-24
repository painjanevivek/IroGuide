import { createHash } from "node:crypto";
import { z } from "zod";

export const reviewJobContractVersion = 1 as const;

export const reviewJobSchema = z.strictObject({
  schemaVersion: z.literal(reviewJobContractVersion),
  id: z.string().min(1).max(200),
  idempotencyKey: z.string().length(64),
  ownerIdHash: z.string().length(16),
  status: z.enum(["accepted", "running", "succeeded", "failed-permanent", "failed-retryable"]),
  attempt: z.number().int().min(0).max(3),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  failureClass: z.enum(["deadline", "rate-limit", "provider-unavailable", "invalid-output", "policy"]).nullable(),
});

export function buildReviewIdempotencyKey({
  briefDigest,
  fileDigest,
  providerContractVersion,
  userId,
}: {
  briefDigest: string;
  fileDigest: string;
  providerContractVersion: string;
  userId: string;
}) {
  return createHash("sha256")
    .update([reviewJobContractVersion, userId, fileDigest, briefDigest, providerContractVersion].join("\u0000"))
    .digest("hex");
}

export function isRetryableReviewFailure(failureClass: z.infer<typeof reviewJobSchema>["failureClass"]) {
  return failureClass === "deadline" || failureClass === "rate-limit" || failureClass === "provider-unavailable";
}
