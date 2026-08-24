import { describe, expect, it } from "vitest";
import { canTransitionReviewJob, canTransitionReviewUpload, reviewJobSchema, reviewUploadSessionSchema } from "./review-pipeline";

describe("review pipeline contracts", () => {
  it("allows only forward upload transitions", () => {
    expect(canTransitionReviewUpload("authorized", "uploaded")).toBe(true);
    expect(canTransitionReviewUpload("uploaded", "validated")).toBe(true);
    expect(canTransitionReviewUpload("validated", "consumed")).toBe(true);
    expect(canTransitionReviewUpload("rejected", "authorized")).toBe(false);
    expect(canTransitionReviewUpload("consumed", "validated")).toBe(false);
  });

  it("allows retry only through the explicit retryable state", () => {
    expect(canTransitionReviewJob("accepted", "running")).toBe(true);
    expect(canTransitionReviewJob("running", "failed-retryable")).toBe(true);
    expect(canTransitionReviewJob("failed-retryable", "running")).toBe(true);
    expect(canTransitionReviewJob("failed-permanent", "running")).toBe(false);
    expect(canTransitionReviewJob("succeeded", "running")).toBe(false);
  });

  it("rejects paths, payloads, and attempt histories outside their bounds", () => {
    const now = "2026-08-24T00:00:00.000Z";
    const upload = reviewUploadSessionSchema.safeParse({
      schemaVersion: 1,
      id: "018f1a80-7b5a-7c61-a9be-2f38de60ec98",
      userId: "owner",
      storagePath: "users/owner/review-uploads/id/source",
      state: "authorized",
      maxBytes: 4 * 1024 * 1024,
      expectedContentType: "image/png",
      issuedAt: now,
      expiresAt: now,
      nonce: "a".repeat(64),
      contentDigest: null,
      validation: null,
      failureClass: null,
      updatedAt: now,
      brief: "must not be accepted",
    });
    expect(upload.success).toBe(false);
    expect(reviewJobSchema.safeParse({ status: "unknown" }).success).toBe(false);
  });
});
