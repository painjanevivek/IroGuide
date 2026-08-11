import { describe, expect, it } from "vitest";
import { createDemoReview } from "./demo-review";
import type { ReviewRequest } from "./review";
import {
  createStoredReviewDocument,
  createImportedReviewDocument,
  getReviewTrustState,
  importedReviewDocumentSchema,
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

  it("accepts only bounded imported review documents without trust claims", () => {
    const review = createDemoReview(request);
    const imported = createImportedReviewDocument({
      category: "logo",
      review,
      savedAt: "2026-08-11T09:30:00.000Z",
      userId: "user-a",
    });

    expect(importedReviewDocumentSchema.safeParse(imported).success).toBe(true);
    expect(importedReviewDocumentSchema.safeParse({ ...imported, status: "complete" }).success).toBe(false);
    expect(importedReviewDocumentSchema.safeParse({ ...imported, origin: "server" }).success).toBe(false);
    expect(importedReviewDocumentSchema.safeParse({
      ...imported,
      provenance: { origin: "server", schemaVersion: 1, generatedAt: imported.savedAt },
    }).success).toBe(false);
    expect(importedReviewDocumentSchema.safeParse({
      ...imported,
      review: { ...review, provider: "live" },
    }).success).toBe(false);
  });
});
