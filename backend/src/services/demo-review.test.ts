import { describe, expect, it } from "vitest";
import { reviewOutputSchema, type ReviewRequest } from "@/domain/review";
import { createDemoReview } from "./demo-review";

const request: ReviewRequest = {
  category: "poster",
  mode: "mentor",
  file: { name: "launch-poster.png", type: "image/png", size: 2048 },
  brief: {
    audience: "Independent designers",
    purpose: "Promote a creative conference",
    style: "Bold editorial",
    goal: "Increase early registrations",
    concern: "The hierarchy feels unclear",
  },
};

describe("createDemoReview", () => {
  it("returns a complete schema-valid review", () => {
    const result = createDemoReview(request);
    expect(reviewOutputSchema.safeParse(result).success).toBe(true);
    expect(result.issues.every((issue) => issue.observation && issue.impact && issue.recommendation)).toBe(true);
    expect(result.checklist.some((item) => item.priority === "high")).toBe(true);
  });

  it("is transparent that it is a deterministic preview", () => {
    expect(createDemoReview(request).summary).toContain("deterministic product preview");
    expect(createDemoReview(request).provider).toBe("demo");
  });
});
