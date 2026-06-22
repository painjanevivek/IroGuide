import { describe, expect, it } from "vitest";
import { improvementOutputSchema } from "./improvement";
import { createDemoImprovementPlan, createDemoReview } from "./demo-review";
import { reviewOutputSchema, type ReviewRequest } from "./review";
import { getReviewRubric } from "./rubrics";

const request: ReviewRequest = {
  category: "logo",
  mode: "mentor",
  file: { name: "logo.png", type: "image/png", size: 120_000 },
  brief: {
    audience: "Teen designers",
    purpose: "Build trust for a portfolio site",
    style: "Bold and minimal",
    goal: "For website logo",
    concern: "The mark feels too plain.",
  },
};

describe("demo review generation", () => {
  it("creates schema-valid review output from a valid request", () => {
    const review = createDemoReview(request);

    expect(reviewOutputSchema.safeParse(review).success).toBe(true);
    expect(review.provider).toBe("demo");
    expect(review.rubricVersion).toBe(getReviewRubric("logo").version);
    expect(review.scores.map((score) => score.label)).toContain("Memorability");
    expect(review.annotations[0]?.issueId).toBe(review.issues[0].id);
    expect(review.summary).toContain("Teen designers");
    expect(review.issues[0].observation).toBe("The mark feels too plain.");
  });

  it("creates schema-valid improvement output from a review", () => {
    const review = createDemoReview(request);
    const plan = createDemoImprovementPlan({ review, target: "human-designer" });

    expect(improvementOutputSchema.safeParse(plan).success).toBe(true);
    expect(plan.provider).toBe("demo");
    expect(plan.prompt).toContain(review.summary);
  });

  it("includes accessibility guidance for interface categories", () => {
    const review = createDemoReview({ ...request, category: "website" });

    expect(review.issues.some((issue) => issue.category === "Accessibility")).toBe(true);
    expect(review.checklist.some((item) => item.label.includes("touch targets"))).toBe(true);
  });
});
