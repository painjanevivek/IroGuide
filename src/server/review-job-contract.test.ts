import { describe, expect, it } from "vitest";
import { buildReviewIdempotencyKey, isRetryableReviewFailure } from "./review-job-contract";

describe("review job activation contract", () => {
  it("creates stable owner- and input-bound idempotency keys", () => {
    const input = { briefDigest: "brief-a", fileDigest: "file-a", providerContractVersion: "review-v1", userId: "owner" };
    expect(buildReviewIdempotencyKey(input)).toBe(buildReviewIdempotencyKey(input));
    expect(buildReviewIdempotencyKey(input)).not.toBe(buildReviewIdempotencyKey({ ...input, userId: "other" }));
    expect(buildReviewIdempotencyKey(input)).toHaveLength(64);
  });

  it("permits retries only for transient failure classes", () => {
    expect(isRetryableReviewFailure("deadline")).toBe(true);
    expect(isRetryableReviewFailure("rate-limit")).toBe(true);
    expect(isRetryableReviewFailure("provider-unavailable")).toBe(true);
    expect(isRetryableReviewFailure("invalid-output")).toBe(false);
    expect(isRetryableReviewFailure("policy")).toBe(false);
  });
});
