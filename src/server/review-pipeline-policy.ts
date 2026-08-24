import { createHash } from "node:crypto";
import type { ReviewJob } from "@/domain/review-pipeline";

export function createReviewJobDocumentId(userId: string, idempotencyKey: string) {
  return createHash("sha256").update(`${userId}\0${idempotencyKey}`).digest("hex");
}

export function classifyReviewProviderFailure(error: unknown): NonNullable<ReviewJob["failureClass"]> {
  if (error && typeof error === "object" && "failureClass" in error
    && (error.failureClass === "policy" || error.failureClass === "rate-limit")) return error.failureClass;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("deadline") || message.includes("timed out") || message.includes("timeout")) return "deadline";
  if (message.includes("429") || message.includes("rate")) return "rate-limit";
  if (message.includes("unavailable") || message.includes("reach its provider")) return "provider-unavailable";
  if (message.includes("schema") || message.includes("json") || message.includes("output")) return "invalid-output";
  return "policy";
}

export function getReviewFailureOutcome({
  attempt,
  deadlineAt,
  failureClass,
  now,
}: {
  attempt: number;
  deadlineAt: string;
  failureClass: ReviewJob["failureClass"];
  now: Date;
}): "failed-retryable" | "failed-permanent" {
  const transient = failureClass === "deadline" || failureClass === "rate-limit" || failureClass === "provider-unavailable";
  return transient && attempt < 3 && Date.parse(deadlineAt) > now.getTime() ? "failed-retryable" : "failed-permanent";
}

export function hasActiveReviewJobLease(job: ReviewJob, attempt: number, workerId: string) {
  return job.status === "running" && job.attempt === attempt && job.leaseOwner === workerId;
}

export function getReviewOutboxRetryDelayMs(attemptCount: number) {
  const boundedAttempt = Math.max(1, Math.min(12, Math.trunc(attemptCount)));
  return Math.min(5 * 60 * 1_000, 1_000 * (2 ** (boundedAttempt - 1)));
}
