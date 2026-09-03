import { describe, expect, it } from "vitest";
import { buildMissingCasePlan, categoryCatalog, planAsCsv, seedCases } from "./review-evaluation-corpus.mjs";

describe("owned provider evaluation corpus plan", () => {
  it("maps exactly the 77 missing cases into the eight-category 3/4/3 distribution", () => {
    const missing = buildMissingCasePlan();
    expect(missing).toHaveLength(77);
    for (const category of Object.keys(categoryCatalog)) {
      const completeCategory = [...seedCases, ...missing].filter((testCase) => testCase.category === category);
      expect(completeCategory).toHaveLength(10);
      expect(completeCategory.filter((testCase) => testCase.qualityLevel === "strong")).toHaveLength(3);
      expect(completeCategory.filter((testCase) => testCase.qualityLevel === "mixed")).toHaveLength(4);
      expect(completeCategory.filter((testCase) => testCase.qualityLevel === "weak-ambiguous")).toHaveLength(3);
    }
  });

  it("covers Mentor everywhere and assigns three Friendly/Direct strata per category", () => {
    const complete = [...seedCases, ...buildMissingCasePlan()];
    expect(complete.every((testCase) => testCase.modes.includes("mentor"))).toBe(true);
    for (const category of Object.keys(categoryCatalog)) {
      const strata = complete.filter((testCase) => testCase.category === category && testCase.modes.includes("friendly") && testCase.modes.includes("direct"));
      expect(strata).toHaveLength(3);
    }
  });

  it("records ownership-safe provenance and an explicit row for every missing case", () => {
    const missing = buildMissingCasePlan();
    expect(missing.every((testCase) => testCase.provenance.thirdPartyAssets === false && testCase.provenance.externalProviderUsed === false)).toBe(true);
    expect(planAsCsv(missing).trim().split("\n")).toHaveLength(78);
  });
});
