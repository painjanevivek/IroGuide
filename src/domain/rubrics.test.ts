import { describe, expect, it } from "vitest";
import { reviewCategories } from "./review";
import { getReviewRubric, reviewRubrics, rubricVersion } from "./rubrics";

describe("review rubrics", () => {
  it("defines a versioned rubric for every review category", () => {
    expect(Object.keys(reviewRubrics).sort()).toEqual([...reviewCategories].sort());

    for (const category of reviewCategories) {
      const rubric = getReviewRubric(category);

      expect(rubric.version).toBe(rubricVersion);
      expect(rubric.dimensions).toHaveLength(5);
      expect(rubric.dimensions.every((dimension) => dimension.label.length > 0)).toBe(true);
      expect(rubric.dimensions.every((dimension) => dimension.guidance.length > 0)).toBe(true);
    }
  });

  it("keeps category-specific evaluation dimensions", () => {
    expect(getReviewRubric("logo").dimensions.map((dimension) => dimension.label)).toEqual([
      "Memorability",
      "Scalability",
      "Distinctiveness",
      "Simplicity",
      "Brand fit",
    ]);

    expect(getReviewRubric("website").dimensions.map((dimension) => dimension.label)).toEqual([
      "Hero clarity",
      "Navigation",
      "Conversion path",
      "Trust signals",
      "Responsiveness/accessibility",
    ]);
  });
});
