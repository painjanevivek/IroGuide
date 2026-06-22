import { describe, expect, it } from "vitest";
import { createDemoFollowUp } from "./demo-follow-up";
import { createDemoReview } from "./demo-review";
import { followUpOutputSchema } from "./follow-up";

const review = createDemoReview({
  category: "ui",
  mode: "mentor",
  file: { name: "screen.png", type: "image/png", size: 180_000 },
  brief: {
    audience: "Product designers",
    purpose: "Improve onboarding",
    style: "Clean",
    goal: "Make the next step clearer",
  },
});

describe("demo follow-up generation", () => {
  it("creates a schema-valid assistant response scoped to a review", () => {
    const response = createDemoFollowUp({ review, question: "What should I fix first?", messages: [] });

    expect(followUpOutputSchema.safeParse(response).success).toBe(true);
    expect(response.message.role).toBe("assistant");
    expect(response.message.content).toContain(review.issues[0].category);
  });
});
