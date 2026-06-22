import { describe, expect, it } from "vitest";
import { getFixFirstAction } from "./review-priority";
import type { ReviewOutput } from "./review";

const baseIssue: ReviewOutput["issues"][number] = {
  category: "Hierarchy",
  score: 6,
  priority: "medium",
  observation: "The first read is unclear.",
  impact: "The viewer does not know where to begin.",
  recommendation: "Make one element dominant.",
  actions: ["Define the first-read element."],
};

describe("getFixFirstAction", () => {
  it("returns null when no issues exist", () => {
    expect(getFixFirstAction({ issues: [] })).toBeNull();
  });

  it("selects a high-priority issue before lower-priority issues", () => {
    const result = getFixFirstAction({
      issues: [
        { ...baseIssue, category: "Spacing", priority: "medium", actions: ["Normalize spacing."] },
        { ...baseIssue, category: "Message", priority: "high", actions: ["Make the headline dominant."] },
      ],
    });

    expect(result?.issueCategory).toBe("Message");
    expect(result?.action).toBe("Make the headline dominant.");
  });

  it("uses the lowest score when priority is tied", () => {
    const result = getFixFirstAction({
      issues: [
        { ...baseIssue, category: "Typography", score: 7, actions: ["Refine type scale."] },
        { ...baseIssue, category: "Contrast", score: 4, actions: ["Reduce competing contrast."] },
      ],
    });

    expect(result?.issueCategory).toBe("Contrast");
  });
});
