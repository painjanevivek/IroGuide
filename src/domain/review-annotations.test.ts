import { describe, expect, it } from "vitest";
import { getAnnotationIssueId, getSafeReviewAnnotations } from "./review-annotations";
import type { ReviewOutput } from "./review";

const issues: ReviewOutput["issues"] = [
  {
    id: "primary-read",
    category: "Hierarchy",
    score: 6,
    priority: "high",
    observation: "The first read is unclear.",
    impact: "Viewers may not know where to begin.",
    recommendation: "Make one element dominant.",
    actions: ["Increase the primary element scale."],
  },
];

describe("review annotations", () => {
  it("links safe annotations to known review issues", () => {
    const annotations = getSafeReviewAnnotations({
      issues,
      annotations: [
        {
          id: "marker-1",
          issueId: "primary-read",
          label: "Primary read",
          description: "The main message needs more dominance.",
          x: 0.2,
          y: 0.1,
          width: 0.45,
          height: 0.2,
          confidence: 0.82,
        },
      ],
    });

    expect(annotations).toHaveLength(1);
    expect(annotations[0]?.issueCategory).toBe("Hierarchy");
    expect(annotations[0]?.issueDomId).toBe("review-primary-read");
  });

  it("drops annotations that do not match an issue", () => {
    const annotations = getSafeReviewAnnotations({
      issues,
      annotations: [
        {
          id: "marker-1",
          issueId: "missing-issue",
          label: "Unknown",
          description: "This should not render.",
          x: 0.2,
          y: 0.1,
          width: 0.45,
          height: 0.2,
          confidence: 0.82,
        },
      ],
    });

    expect(annotations).toEqual([]);
  });

  it("falls back to index-based issue ids for older review output", () => {
    expect(getAnnotationIssueId({ ...issues[0], id: undefined }, 1)).toBe("issue-2");
  });
});
