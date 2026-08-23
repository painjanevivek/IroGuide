import { describe, expect, it } from "vitest";
import { classifyComparisonIssue, comparisonIssueMatchSchema } from "./comparison-contract";

describe("revision comparison contract", () => {
  it.each([
    ["improved", 7, 8],
    ["remaining", 7, 7.4],
    ["regressed", 8, 7],
  ] as const)("classifies %s matched evidence", (outcome, originalScore, revisedScore) => {
    expect(classifyComparisonIssue({ confidence: 0.9, originalIssueId: "before", originalScore, revisedIssueId: "after", revisedScore })).toBe(outcome);
  });

  it("separates unmatched and low-confidence observations", () => {
    expect(classifyComparisonIssue({ confidence: 0.9, originalIssueId: "before", originalScore: 7, revisedIssueId: null, revisedScore: null })).toBe("unmatched");
    expect(classifyComparisonIssue({ confidence: 0.4, originalIssueId: "before", originalScore: 7, revisedIssueId: "after", revisedScore: 9 })).toBe("low-confidence");
  });

  it("rejects confident claims without evidence and invented low-confidence claims", () => {
    expect(comparisonIssueMatchSchema.safeParse({ originalIssueId: "before", revisedIssueId: "after", outcome: "improved", confidence: 0.9, evidence: [] }).success).toBe(false);
    expect(comparisonIssueMatchSchema.safeParse({ originalIssueId: "before", revisedIssueId: "after", outcome: "low-confidence", confidence: 0.9, evidence: ["Observed hierarchy shift."] }).success).toBe(false);
  });
});
