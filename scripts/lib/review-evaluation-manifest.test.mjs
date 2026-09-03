import { describe, expect, it } from "vitest";
import { supportedReviewCategories, validateCompletedDistribution } from "./review-evaluation-manifest.mjs";

function completeCorpus() {
  const cases = supportedReviewCategories.flatMap((category) => Array.from({ length: 10 }, (_, index) => ({
    category,
    qualityLevel: index < 3 ? "strong" : index < 7 ? "mixed" : "weak-ambiguous",
    modes: ["mentor"],
  })));
  for (let categoryIndex = 0; categoryIndex < supportedReviewCategories.length; categoryIndex += 1) {
    for (const testCase of cases.slice(categoryIndex * 10, categoryIndex * 10 + 3)) testCase.modes = ["mentor", "friendly", "direct"];
  }
  return { targetCaseCount: 80, cases };
}

describe("provider evaluation corpus distribution", () => {
  it("does not pretend an incomplete owned corpus is complete", () => {
    expect(validateCompletedDistribution({ targetCaseCount: 80, cases: [] })).toEqual([]);
  });

  it("accepts ten cases per category with the required quality and mode stratification", () => {
    expect(validateCompletedDistribution(completeCorpus())).toEqual([]);
  });

  it("rejects a completed corpus that overrepresents easy cases or misses mode coverage", () => {
    const corpus = completeCorpus();
    corpus.cases[0].qualityLevel = "mixed";
    corpus.cases[1].modes = ["mentor"];
    const errors = validateCompletedDistribution(corpus);
    expect(errors.some((error) => error.includes("strong"))).toBe(true);
    expect(errors.some((error) => error.includes("24 stratified"))).toBe(true);
  });

  it("rejects 24 strata when they are not balanced across categories", () => {
    const corpus = completeCorpus();
    corpus.cases[2].modes = ["mentor"];
    corpus.cases[13].modes = ["mentor", "friendly", "direct"];
    expect(validateCompletedDistribution(corpus).some((error) => error.includes("exactly 3"))).toBe(true);
  });
});
