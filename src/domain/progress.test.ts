import { describe, expect, it } from "vitest";
import { calculateProgress } from "./progress";

describe("calculateProgress", () => {
  it("does not fabricate insight for empty history", () => {
    const summary = calculateProgress([]);

    expect(summary.totalReviews).toBe(0);
    expect(summary.weakest).toBeNull();
    expect(summary.scoreChange).toBeNull();
    expect(summary.insights).toEqual([]);
  });

  it("waits for a second review before calculating score change", () => {
    const summary = calculateProgress([
      {
        overallScore: 7.4,
        createdAt: "2026-01-01T00:00:00Z",
        scores: [{ label: "Hierarchy", score: 6 }],
      },
    ]);

    expect(summary.averageScore).toBe(7.4);
    expect(summary.scoreChange).toBeNull();
    expect(summary.strongest).toBeNull();
    expect(summary.evidenceState).toBe("baseline");
    expect(summary.insights[0]).toContain("baseline");
  });

  it("calculates chronological change and recurring dimensions", () => {
    const summary = calculateProgress([
      {
        overallScore: 7,
        createdAt: "2026-02-01T00:00:00Z",
        scores: [
          { label: "Color", score: 8 },
          { label: "Hierarchy", score: 5 },
        ],
        issues: [{ category: "Hierarchy" }],
      },
      {
        overallScore: 6,
        createdAt: "2026-01-01T00:00:00Z",
        scores: [
          { label: "Color", score: 7 },
          { label: "Hierarchy", score: 4 },
        ],
        issues: [{ category: "Hierarchy" }],
      },
    ]);

    expect(summary.scoreChange).toBe(1);
    expect(summary.strongest?.label).toBe("Color");
    expect(summary.weakest?.label).toBe("Hierarchy");
    expect(summary.evidenceState).toBe("comparable");
    expect(summary.recurringIssues).toEqual([{ category: "Hierarchy", count: 2 }]);
    expect(summary.insights).toContain("Your overall score changed by +1 points from first to latest review.");
    expect(summary.insights).toContain("Hierarchy is your recurring weak spot at 4.5/10 average.");
  });
});
