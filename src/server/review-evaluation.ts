import "server-only";

import {
  calculateRubricScore,
  type GroundedReviewFinding,
  validateGroundedFindings,
} from "@/domain/critique-rubrics";
import type { ReviewCategory } from "@/domain/review";

type Specialist = () => Promise<GroundedReviewFinding[]>;

export async function runSpecialistReviewExperiment({
  category,
  runAccessibility,
  runVisual,
}: {
  category: ReviewCategory;
  runAccessibility: Specialist;
  runVisual: Specialist;
}) {
  const [visual, accessibility] = await Promise.all([runVisual(), runAccessibility()]);
  const candidates = [...visual, ...accessibility];
  const invalid = validateGroundedFindings(category, candidates);
  if (invalid.length > 0) throw new ReviewEvaluationValidationError(invalid);

  const findings = deduplicateFindings(candidates);
  const scores = Object.fromEntries(findings.map((finding) => [finding.rubricId, finding.score]));
  return {
    findings,
    overallScore: calculateRubricScore(category, scores) ?? 0,
    execution: {
      engineVersion: "specialist-experiment-v1",
      rubricVersion: "2026-08-critique-pilot-v1",
      agentsExecuted: ["visual-task", "accessibility-risk"],
    },
  };
}

export class ReviewEvaluationValidationError extends Error {
  constructor(readonly reasons: string[]) {
    super("Specialist findings did not satisfy the measurable critique contract.");
    this.name = "ReviewEvaluationValidationError";
  }
}

function deduplicateFindings(findings: GroundedReviewFinding[]) {
  const byCriterion = new Map<string, GroundedReviewFinding>();
  for (const finding of findings) {
    const previous = byCriterion.get(finding.rubricId);
    if (!previous || isMoreSevere(finding, previous)) byCriterion.set(finding.rubricId, finding);
  }
  return [...byCriterion.values()].sort((left, right) => right.confidence - left.confidence);
}

function isMoreSevere(candidate: GroundedReviewFinding, previous: GroundedReviewFinding) {
  const priority = { high: 3, medium: 2, low: 1 } as const;
  return priority[candidate.priority] > priority[previous.priority]
    || (priority[candidate.priority] === priority[previous.priority] && candidate.confidence > previous.confidence);
}
