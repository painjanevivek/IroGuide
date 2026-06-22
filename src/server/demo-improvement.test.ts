import { describe, expect, it } from "vitest";
import { createDemoReview } from "./demo-review";
import { createDemoImprovement } from "./demo-improvement";
import { improvementOutputSchema } from "@/domain/improvement";

const review = createDemoReview({ category: "poster", mode: "mentor", file: { name: "event.png", type: "image/png", size: 2048 }, brief: { audience: "Creative professionals", purpose: "Promote an event", style: "Editorial", goal: "Drive registrations" } });

describe("createDemoImprovement", () => {
  it("orders high-priority fixes before lower-priority refinements", () => {
    const output = createDemoImprovement({ review, target: "human-designer" });
    expect(improvementOutputSchema.safeParse(output).success).toBe(true);
    expect(output.steps[0].title).toContain("hierarchy");
    expect(output.prompt).toContain("Address these critique findings");
  });
});
