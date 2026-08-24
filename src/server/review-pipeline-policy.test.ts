import { describe, expect, it } from "vitest";
import { reviewJobSchema } from "@/domain/review-pipeline";
import {
  classifyReviewProviderFailure,
  createReviewJobDocumentId,
  getReviewFailureOutcome,
  getReviewOutboxRetryDelayMs,
  hasActiveReviewJobLease,
} from "./review-pipeline-policy";

describe("review pipeline reliability policy", () => {
  it("maps a user's idempotency key to one deterministic document without cross-owner collisions", () => {
    const first = createReviewJobDocumentId("owner-a", "request-key-0001");
    expect(createReviewJobDocumentId("owner-a", "request-key-0001")).toBe(first);
    expect(createReviewJobDocumentId("owner-b", "request-key-0001")).not.toBe(first);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    [new Error("provider timeout"), "deadline"],
    [new Error("HTTP 429"), "rate-limit"],
    [new Error("provider unavailable"), "provider-unavailable"],
    [new Error("invalid JSON output"), "invalid-output"],
    [new Error("blocked"), "policy"],
  ] as const)("classifies injected provider failure %# without payload data", (error, expected) => {
    expect(classifyReviewProviderFailure(error)).toBe(expected);
  });

  it("retries only transient failures inside the shared deadline and attempt budget", () => {
    const now = new Date("2026-08-24T00:00:00.000Z");
    const future = "2026-08-24T00:01:00.000Z";
    expect(getReviewFailureOutcome({ attempt: 1, deadlineAt: future, failureClass: "provider-unavailable", now })).toBe("failed-retryable");
    expect(getReviewFailureOutcome({ attempt: 3, deadlineAt: future, failureClass: "provider-unavailable", now })).toBe("failed-permanent");
    expect(getReviewFailureOutcome({ attempt: 1, deadlineAt: future, failureClass: "invalid-output", now })).toBe("failed-permanent");
    expect(getReviewFailureOutcome({ attempt: 1, deadlineAt: now.toISOString(), failureClass: "deadline", now })).toBe("failed-permanent");
  });

  it("rejects stale or duplicate worker completion after lease ownership changes", () => {
    const job = createJob();
    expect(hasActiveReviewJobLease(job, 1, "worker-a")).toBe(true);
    expect(hasActiveReviewJobLease(job, 1, "worker-b")).toBe(false);
    expect(hasActiveReviewJobLease({ ...job, status: "cancelled" }, 1, "worker-a")).toBe(false);
    expect(hasActiveReviewJobLease({ ...job, attempt: 2 }, 1, "worker-a")).toBe(false);
  });

  it("uses bounded exponential delivery backoff", () => {
    expect(getReviewOutboxRetryDelayMs(1)).toBe(1_000);
    expect(getReviewOutboxRetryDelayMs(5)).toBe(16_000);
    expect(getReviewOutboxRetryDelayMs(12)).toBe(300_000);
    expect(getReviewOutboxRetryDelayMs(99)).toBe(300_000);
  });
});

function createJob() {
  const now = "2026-08-24T00:00:00.000Z";
  return reviewJobSchema.parse({
    schemaVersion: 1,
    id: "018f1a80-7b5a-7c61-a9be-2f38de60ec98",
    userId: "owner",
    uploadSessionId: "018f1a80-7b5a-7c61-a9be-2f38de60ec99",
    idempotencyKey: "request-key-0001",
    requestDigest: "a".repeat(64),
    status: "running",
    attempt: 1,
    attempts: [{ attempt: 1, startedAt: now, finishedAt: null, leaseExpiresAt: "2026-08-24T00:00:35.000Z", failureClass: null, workerId: "worker-a" }],
    category: "website",
    mode: "mentor",
    brief: { audience: "Designers", purpose: "Test reliability", style: "Editorial", goal: "Validate leases", concern: "Concurrency" },
    provider: "test",
    model: "test",
    providerContractVersion: "review-v1",
    rubricVersion: "test-v1",
    deadlineAt: "2026-08-24T00:02:00.000Z",
    resultDocumentId: null,
    failureClass: null,
    leaseOwner: "worker-a",
    createdAt: now,
    updatedAt: now,
  });
}
