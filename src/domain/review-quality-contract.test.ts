import { describe, expect, it } from "vitest";
import { reviewOutputSchema } from "./review";

const legacyReview = {
  id: "review-1",
  createdAt: "2026-08-13T00:00:00.000Z",
  overallScore: 7,
  summary: "A useful review.",
  strengths: ["Clear goal"],
  scores: [{ label: "Task clarity", score: 7 }],
  rubricVersion: "legacy",
  issues: [{
    id: "issue-1",
    category: "Clarity",
    score: 6,
    priority: "medium",
    observation: "The hierarchy competes.",
    impact: "The task takes longer to understand.",
    recommendation: "Strengthen the main action.",
    actions: ["Increase emphasis."],
  }],
  annotations: [],
  checklist: [],
  followUps: [],
  provider: "live",
};

describe("review quality contract", () => {
  it("keeps legacy reviews readable without fabricating evidence", () => {
    const parsed = reviewOutputSchema.parse(legacyReview);

    expect(parsed.issues[0]).not.toHaveProperty("rubricId");
    expect(parsed.issues[0]).not.toHaveProperty("evidenceKind");
  });

  it("accepts new grounded fields and keeps visual-risk claims explicit", () => {
    const parsed = reviewOutputSchema.parse({
      ...legacyReview,
      issues: [{
        ...legacyReview.issues[0],
        rubricId: "UI-VISUAL-ACCESSIBILITY-001",
        evidenceKind: "visual-risk",
        evidenceDescription: "Pale helper text against a white card.",
        confidence: 0.84,
      }],
    });

    expect(parsed.issues[0].evidenceDescription).toBe("Pale helper text against a white card.");
  });
});
