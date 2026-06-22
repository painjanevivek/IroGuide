import { describe, expect, it } from "vitest";
import { comparisonOutputSchema, type ComparisonRequest } from "./comparison";
import { createDemoComparison } from "./demo-comparison";
import { createDemoReview } from "./demo-review";

const originalReview = createDemoReview({
  category: "poster",
  mode: "mentor",
  file: { name: "poster.png", type: "image/png", size: 140_000 },
  brief: {
    audience: "Design students",
    purpose: "Promote a workshop",
    style: "Editorial",
    goal: "Make the headline read first",
    concern: "The layout feels crowded.",
  },
});

const request: ComparisonRequest = {
  originalReview,
  revisedFile: { name: "poster-v2.png", type: "image/png", size: 150_000 },
};

describe("demo comparison generation", () => {
  it("creates schema-valid comparison output without mutating the original review", () => {
    const comparison = createDemoComparison(request);

    expect(comparisonOutputSchema.safeParse(comparison).success).toBe(true);
    expect(comparison.originalReviewId).toBe(originalReview.id);
    expect(comparison.revisedScore).toBeGreaterThan(originalReview.overallScore);
    expect(originalReview.overallScore).toBe(7.2);
  });
});
