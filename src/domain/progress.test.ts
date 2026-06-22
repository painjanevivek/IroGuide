import { describe, expect, it } from "vitest";
import { calculateProgress } from "./progress";

describe("calculateProgress", () => {
  it("does not fabricate insight for empty history", () => {
    const summary = calculateProgress([]);

    expect(summary.totalReviews).toBe(0);
    expect(summary.weakest).toBeNull();
    expect(summary.scoreChange).toBeNull();
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
    expect(summary.strongest?.label).toBe("Hierarchy");
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
      },
      {
        overallScore: 6,
        createdAt: "2026-01-01T00:00:00Z",
        scores: [
          { label: "Color", score: 7 },
          { label: "Hierarchy", score: 4 },
        ],
      },
    ]);

    expect(summary.scoreChange).toBe(1);
    expect(summary.strongest?.label).toBe("Color");
    expect(summary.weakest?.label).toBe("Hierarchy");
  });
});
