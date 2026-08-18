import { describe, expect, it } from "vitest";
import { clampCritiqueBeatIndex, critiqueBeats, getCritiqueBeat } from "@/features/marketing/critique-preview-model";

describe("critique preview model", () => {
  it("defines three distinct, clearly illustrative critique beats", () => {
    expect(critiqueBeats).toHaveLength(3);
    expect(new Set(critiqueBeats.map((beat) => beat.id)).size).toBe(critiqueBeats.length);

    for (const beat of critiqueBeats) {
      expect(beat.copy).toMatch(/illustrative example/i);
      expect(beat.outcome).toMatch(/^Outcome:/);
    }
  });

  it("clamps rapid or invalid selection requests to one valid beat", () => {
    expect(clampCritiqueBeatIndex(-10)).toBe(0);
    expect(clampCritiqueBeatIndex(1.6)).toBe(2);
    expect(clampCritiqueBeatIndex(99)).toBe(2);
    expect(clampCritiqueBeatIndex(Number.NaN)).toBe(0);
    expect(getCritiqueBeat(99).id).toBe("refine");
  });
});
