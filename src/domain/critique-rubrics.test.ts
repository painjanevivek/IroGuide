import { describe, expect, it } from "vitest";
import {
  calculateRubricScore,
  getCritiqueRubric,
  getRubricCriterion,
  validateGroundedFindings,
} from "./critique-rubrics";

describe("measurable critique rubrics", () => {
  it("defines complete, weighted criteria for the UI pilot", () => {
    const rubric = getCritiqueRubric("ui");

    expect(rubric.version).toMatch(/^2026-/);
    expect(rubric.criteria).toHaveLength(5);
    expect(rubric.criteria.reduce((total, criterion) => total + criterion.weight, 0)).toBe(1);
    expect(rubric.criteria.every((criterion) => criterion.id.startsWith("UI-"))).toBe(true);
    expect(rubric.criteria.every((criterion) => criterion.scoreAnchors[0] && criterion.scoreAnchors[10])).toBe(true);
  });

  it("calculates a deterministic weighted score from only the category criteria", () => {
    expect(calculateRubricScore("website", {
      "WEB-HERO-CLARITY-001": 10,
      "WEB-NAVIGATION-001": 8,
      "WEB-CONVERSION-PATH-001": 6,
      "WEB-TRUST-001": 4,
      "WEB-VISUAL-ACCESSIBILITY-001": 2,
      "UI-TASK-CLARITY-001": 0,
    })).toBe(6);
  });

  it("rejects unsupported, unknown, and scope-violating findings", () => {
    expect(validateGroundedFindings("ui", [{
      rubricId: "UI-VISUAL-ACCESSIBILITY-001",
      score: 4,
      priority: "medium",
      observation: "The pale secondary text is difficult to distinguish from the white panel.",
      evidenceKind: "visual-risk",
      evidenceDescription: "Small pale-gray labels on white cards in the right column.",
      impact: "Some people may struggle to scan the supporting information.",
      recommendation: "Increase visible contrast and verify the final colors with a contrast tool.",
      actions: ["Use a darker text token."],
      confidence: 0.82,
    }])).toEqual([]);

    expect(validateGroundedFindings("ui", [{
      rubricId: "UI-VISUAL-ACCESSIBILITY-001",
      score: 4,
      priority: "medium",
      observation: "Keyboard focus fails on every control.",
      evidenceKind: "visible",
      evidenceDescription: "The screenshot has a form.",
      impact: "Keyboard users cannot complete the task.",
      recommendation: "Fix keyboard focus.",
      actions: ["Add focus styles."],
      confidence: 0.9,
    }])[0]).toMatch(/keyboard|runtime/i);

    expect(getRubricCriterion("UNKNOWN-001")).toBeUndefined();
  });
});
