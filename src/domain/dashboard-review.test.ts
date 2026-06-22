import { describe, expect, it } from "vitest";
import { getRecentReviewSummary } from "./dashboard-review";
import type { ReviewOutput } from "./review";

type ReviewFixture = Partial<ReviewOutput> & { id: string; createdAt: string; category?: string };

function review(overrides: ReviewFixture): ReviewOutput & { category?: string } {
  return {
    id: overrides.id,
    createdAt: overrides.createdAt,
    overallScore: overrides.overallScore ?? 7.2,
    summary: overrides.summary ?? "The design has a clear foundation. It needs a more deliberate first read.",
    strengths: overrides.strengths ?? ["Clear audience direction"],
    scores: overrides.scores ?? [
      { label: "Hierarchy", score: 6 },
      { label: "Audience fit", score: 8 },
    ],
    issues: overrides.issues ?? [
      {
        category: "Hierarchy",
        score: 5,
        priority: "high",
        observation: "The first read is unclear.",
        impact: "The viewer does not know where to begin.",
        recommendation: "Make one element dominant.",
        actions: ["Define the first-read element before adjusting details."],
      },
    ],
    checklist: overrides.checklist ?? [{ label: "Define the first-read element.", priority: "high" }],
    followUps: overrides.followUps ?? ["What should I simplify first?"],
    provider: "demo",
    category: overrides.category,
  };
}

describe("getRecentReviewSummary", () => {
  it("returns null for an empty review list", () => {
    expect(getRecentReviewSummary([])).toBeNull();
  });

  it("uses the newest review and strongest score", () => {
    const summary = getRecentReviewSummary([
      review({ id: "old", createdAt: "2026-01-01T00:00:00.000Z", category: "Logo" }),
      review({ id: "new", createdAt: "2026-02-01T00:00:00.000Z", category: "Poster" }),
    ]);

    expect(summary?.id).toBe("new");
    expect(summary?.category).toBe("Poster");
    expect(summary?.strongestArea).toBe("Audience fit");
  });

  it("falls back from high priority to the best available priority", () => {
    const summary = getRecentReviewSummary([
      review({
        id: "medium-only",
        createdAt: "2026-02-01T00:00:00.000Z",
        issues: [
          {
            category: "Spacing",
            score: 7,
            priority: "medium",
            observation: "Spacing is inconsistent.",
            impact: "The system feels less intentional.",
            recommendation: "Use one spacing rhythm.",
            actions: ["Normalize spacing before changing color."],
          },
        ],
      }),
    ]);

    expect(summary?.fixFirst).toBe("Spacing");
    expect(summary?.firstAction).toBe("Normalize spacing before changing color.");
  });
});
