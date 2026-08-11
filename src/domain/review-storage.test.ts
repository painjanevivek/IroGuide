import { describe, expect, it } from "vitest";
import { createDemoReview } from "./demo-review";
import type { ReviewRequest } from "./review";
import {
  createStoredReviewDocument,
  getReviewTrustState,
  isTrustedReviewDocument,
  trustedReviewProvenanceSchema,
} from "./review-storage";

const request: ReviewRequest = {
  category: "logo",
  mode: "mentor",
  file: { name: "mark.png", type: "image/png", size: 1024 },
  brief: {
    audience: "Independent designers",
    purpose: "Evaluate a brand mark",
    style: "Bold minimal identity",
    goal: "Improve first impression",
    concern: "",
  },
};

describe("review provenance", () => {
  it("accepts only the exact server provenance contract", () => {
    const valid = {
      origin: "server",
      schemaVersion: 1,
      generatedAt: "2026-08-11T09:30:00.000Z",
    };

    expect(trustedReviewProvenanceSchema.safeParse(valid).success).toBe(true);
    expect(trustedReviewProvenanceSchema.safeParse({ ...valid, origin: "imported" }).success).toBe(false);
    expect(trustedReviewProvenanceSchema.safeParse({ ...valid, schemaVersion: 2 }).success).toBe(false);
    expect(trustedReviewProvenanceSchema.safeParse({ ...valid, generatedAt: "yesterday" }).success).toBe(false);
    expect(trustedReviewProvenanceSchema.safeParse({ ...valid, assertedBy: "browser" }).success).toBe(false);
  });

  it("trusts only completed records with consistent provider data and server provenance", () => {
    const document = createStoredReviewDocument({
      userId: "user-a",
      review: createDemoReview(request),
      category: "logo",
    });
    const trusted = {
      ...document,
      provenance: {
        origin: "server" as const,
        schemaVersion: 1 as const,
        generatedAt: "2026-08-11T09:30:00.000Z",
      },
    };

    expect(isTrustedReviewDocument(trusted)).toBe(true);
    expect(getReviewTrustState(trusted)).toBe("server-verified");
    expect(isTrustedReviewDocument(document)).toBe(false);
    expect(getReviewTrustState(document)).toBe("legacy-unverified");
    expect(isTrustedReviewDocument({ ...trusted, provider: trusted.review.provider === "live" ? "demo" : "live" })).toBe(false);
  });
});
