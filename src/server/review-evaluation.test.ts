import { describe, expect, it } from "vitest";
import { runSpecialistReviewExperiment } from "./review-evaluation";

const visualFinding = {
  rubricId: "UI-TASK-CLARITY-001",
  score: 4,
  priority: "high" as const,
  observation: "The primary action is visually similar to secondary controls.",
  evidenceKind: "visible" as const,
  evidenceDescription: "The main button and utility buttons share the same muted treatment in the header.",
  impact: "Users may not know how to continue the task.",
  recommendation: "Use a single high-emphasis treatment for the primary action.",
  actions: ["Increase the primary action's contrast and visual weight."],
  confidence: 0.9,
};

describe("review evaluation experiment", () => {
  it("keeps only rubric-backed specialist findings and resolves exact duplicates deterministically", async () => {
    const result = await runSpecialistReviewExperiment({
      category: "ui",
      runVisual: async () => [visualFinding, { ...visualFinding, priority: "medium" as const, confidence: 0.65 }],
      runAccessibility: async () => [{
        ...visualFinding,
        rubricId: "UI-VISUAL-ACCESSIBILITY-001",
        observation: "The pale helper text is difficult to distinguish from the white panel.",
        evidenceKind: "visual-risk" as const,
        evidenceDescription: "Small pale-gray helper text on white cards.",
        impact: "Some people may have difficulty reading supporting information.",
        recommendation: "Increase contrast and verify the final colors with a contrast tool.",
        actions: ["Use a darker helper text token."],
        confidence: 0.8,
      }],
    });

    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]).toMatchObject({ rubricId: "UI-TASK-CLARITY-001", priority: "high" });
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.execution.agentsExecuted).toEqual(["visual-task", "accessibility-risk"]);
  });
});
