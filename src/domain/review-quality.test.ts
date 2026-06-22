import { describe, expect, it } from "vitest";
import { createDemoReview } from "@/server/demo-review";
import { inspectReviewQuality } from "./review-quality";
import type { ReviewRequest } from "./review";

const request: ReviewRequest = { category: "ui", mode: "direct", file: { name: "checkout.webp", type: "image/webp", size: 4096 }, brief: { audience: "Mobile shoppers", purpose: "Complete checkout", style: "Clean and trustworthy", goal: "Reduce checkout abandonment" } };

describe("review quality", () => {
  it("accepts a complete review with aligned evidence and actions", () => {
    expect(inspectReviewQuality(createDemoReview(request))).toEqual([]);
  });

  it("detects score and checklist drift", () => {
    const review = createDemoReview(request);
    review.overallScore = 1;
    review.checklist[0].priority = "medium";
    review.issues = review.issues.filter((issue) => issue.priority !== "medium");
    expect(inspectReviewQuality(review).map((finding) => finding.code)).toEqual(expect.arrayContaining(["score.large_mismatch", "checklist.priority_drift"]));
  });
});
