import type { ReviewCategory } from "./review";
import { validateGroundedFindings, type GroundedReviewFinding } from "./critique-rubrics";

export type AdjudicatedReviewCase = {
  id: string;
  category: "ui" | "website";
  expectedCriterionIds: readonly string[];
};

export type ReviewEvaluationMetrics = {
  matchedCriteria: number;
  missedCriteria: number;
  extraCriteria: number;
  unsupportedFindings: number;
  precision: number;
  recall: number;
  unsupportedFindingRate: number;
};

/**
 * Scores critique findings against human-adjudicated criterion labels.
 * Runtime-only accessibility assertions are counted as unsupported rather
 * than being allowed to inflate recall or precision.
 */
export function measureReviewEvaluation(
  testCase: AdjudicatedReviewCase,
  findings: GroundedReviewFinding[],
): ReviewEvaluationMetrics {
  const invalidFindingIndexes = new Set<number>();
  findings.forEach((finding, index) => {
    if (validateGroundedFindings(testCase.category as ReviewCategory, [finding]).length > 0) {
      invalidFindingIndexes.add(index);
    }
  });

  const validCriterionIds = new Set(findings
    .filter((_, index) => !invalidFindingIndexes.has(index))
    .map((finding) => finding.rubricId));
  const expectedCriterionIds = new Set(testCase.expectedCriterionIds);
  const matchedCriteria = [...validCriterionIds].filter((criterionId) => expectedCriterionIds.has(criterionId)).length;
  const extraCriteria = [...validCriterionIds].filter((criterionId) => !expectedCriterionIds.has(criterionId)).length;
  const missedCriteria = [...expectedCriterionIds].filter((criterionId) => !validCriterionIds.has(criterionId)).length;
  const evaluatedFindingCount = findings.length;
  const supportedMatchCount = matchedCriteria;

  return {
    matchedCriteria,
    missedCriteria,
    extraCriteria,
    unsupportedFindings: invalidFindingIndexes.size,
    precision: ratio(supportedMatchCount, supportedMatchCount + extraCriteria + invalidFindingIndexes.size),
    recall: ratio(matchedCriteria, matchedCriteria + missedCriteria),
    unsupportedFindingRate: ratio(invalidFindingIndexes.size, evaluatedFindingCount),
  };
}

export function meetsReviewEvaluationGate(metrics: ReviewEvaluationMetrics) {
  return metrics.precision >= 0.8
    && metrics.recall >= 0.7
    && metrics.unsupportedFindingRate <= 0.05;
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}
