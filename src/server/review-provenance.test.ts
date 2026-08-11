import { describe, expect, it } from "vitest";
import { createDemoReview } from "@/domain/demo-review";
import type { ReviewRequest } from "@/domain/review";
import { createTrustedReviewDocument } from "./review-provenance";

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

describe("server review provenance", () => {
  it("derives an exact server attestation from the server clock", () => {
    const document = createTrustedReviewDocument({
      category: "logo",
      review: createDemoReview(request),
      userId: "verified-user",
    }, { now: () => new Date("2026-08-11T09:30:00.000Z") });

    expect(document.provenance).toEqual({
      origin: "server",
      schemaVersion: 1,
      generatedAt: "2026-08-11T09:30:00.000Z",
    });
    expect(document.status).toBe("complete");
    expect(document.syncState).toBe("cloud");
  });
});
