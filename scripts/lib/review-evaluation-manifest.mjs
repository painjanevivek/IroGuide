export const supportedReviewCategories = [
  "logo", "poster", "social", "ui", "website", "book-cover", "packaging", "other",
];

export const evaluationQualityLevels = ["strong", "mixed", "weak-ambiguous"];
export const evaluationModes = ["mentor", "friendly", "direct"];

export function validateCompletedDistribution(manifest) {
  const cases = Array.isArray(manifest?.cases) ? manifest.cases : [];
  const target = Number.isInteger(manifest?.targetCaseCount) ? manifest.targetCaseCount : 80;
  if (cases.length < target) return [];

  const errors = [];
  for (const category of supportedReviewCategories) {
    const categoryCases = cases.filter((testCase) => testCase.category === category);
    if (categoryCases.length !== 10) errors.push(`${category}: completed corpus must contain exactly 10 cases.`);
    for (const [qualityLevel, expected] of [["strong", 3], ["mixed", 4], ["weak-ambiguous", 3]]) {
      const actual = categoryCases.filter((testCase) => testCase.qualityLevel === qualityLevel).length;
      if (actual !== expected) errors.push(`${category}: expected ${expected} ${qualityLevel} cases, received ${actual}.`);
    }
  }

  if (cases.some((testCase) => !testCase.modes?.includes("mentor"))) errors.push("Every completed-corpus case must include Mentor evaluation.");
  const stratifiedCases = cases.filter((testCase) => testCase.modes?.includes("friendly") || testCase.modes?.includes("direct"));
  if (stratifiedCases.length !== 24 || stratifiedCases.some((testCase) => !testCase.modes.includes("friendly") || !testCase.modes.includes("direct"))) {
    errors.push("Exactly 24 stratified cases must include both Friendly and Direct evaluation.");
  }
  for (const category of supportedReviewCategories) {
    const categoryStrata = stratifiedCases.filter((testCase) => testCase.category === category);
    if (categoryStrata.length !== 3) errors.push(`${category}: exactly 3 cases must include the Friendly/Direct stratum.`);
  }
  return errors;
}

export function summarizeCoverage(manifest) {
  const cases = Array.isArray(manifest?.cases) ? manifest.cases : [];
  return Object.fromEntries(supportedReviewCategories.map((category) => {
    const categoryCases = cases.filter((testCase) => testCase.category === category);
    return [category, {
      registered: categoryCases.length,
      target: 10,
      quality: Object.fromEntries(evaluationQualityLevels.map((qualityLevel) => [qualityLevel, categoryCases.filter((testCase) => testCase.qualityLevel === qualityLevel).length])),
      mentor: categoryCases.filter((testCase) => testCase.modes?.includes("mentor")).length,
      friendlyDirectStrata: categoryCases.filter((testCase) => testCase.modes?.includes("friendly") && testCase.modes?.includes("direct")).length,
    }];
  }));
}
