import { describe, expect, it } from "vitest";
import { measureReviewEvaluation, meetsReviewEvaluationGate } from "./review-evaluation-metrics";
import type { GroundedReviewFinding } from "./critique-rubrics";

const finding: GroundedReviewFinding = {
  rubricId: "UI-TASK-CLARITY-001",
  score: 4,
  priority: "high",
  observation: "The primary action is visually subordinate to the secondary options.",
  evidenceKind: "visible",
  evidenceDescription: "A small outlined primary action sits below two larger neutral cards.",
  impact: "People may not know how to continue.",
  recommendation: "Make the primary action more visually prominent.",
  actions: ["Increase the primary action's contrast."],
  confidence: 0.87,
};

describe("review evaluation metrics", () => {
  it("penalizes unsupported findings before calculating quality", () => {
    const unsupported = { ...finding, rubricId: "UI-VISUAL-ACCESSIBILITY-001", observation: "Keyboard focus fails.", evidenceKind: "visual-risk" as const };
    const metrics = measureReviewEvaluation({ id: "case-1", category: "ui", expectedCriterionIds: [finding.rubricId] }, [finding, unsupported]);

    expect(metrics).toMatchObject({ matchedCriteria: 1, unsupportedFindings: 1, precision: 0.5, recall: 1, unsupportedFindingRate: 0.5 });
    expect(meetsReviewEvaluationGate(metrics)).toBe(false);
  });

  it("passes only when precision, recall, and evidence quality meet the guardrail", () => {
    const metrics = measureReviewEvaluation({ id: "case-1", category: "ui", expectedCriterionIds: [finding.rubricId] }, [finding]);
    expect(metrics).toMatchObject({ precision: 1, recall: 1, unsupportedFindingRate: 0 });
    expect(meetsReviewEvaluationGate(metrics)).toBe(true);
  });
});
