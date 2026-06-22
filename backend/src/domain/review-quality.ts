import type { ReviewOutput } from "./review";

export type QualityFinding = { code: string; message: string };

export function inspectReviewQuality(review: ReviewOutput): QualityFinding[] {
  const findings: QualityFinding[] = [];
  if (review.summary.trim().length < 80) findings.push({ code: "summary.too_short", message: "Summary must contain enough reasoning to contextualize the score." });
  if (review.strengths.length < 2) findings.push({ code: "strengths.too_few", message: "Review must identify at least two evidence-based strengths." });
  if (!review.issues.some((issue) => issue.priority === "high")) findings.push({ code: "issues.no_high_priority", message: "Review must make the first meaningful correction discoverable." });

  review.issues.forEach((issue, index) => {
    if (issue.observation.trim().length < 30) findings.push({ code: "issue.observation_weak", message: `Issue ${index + 1} needs a specific observation.` });
    if (issue.impact.trim().length < 30) findings.push({ code: "issue.impact_weak", message: `Issue ${index + 1} must explain why it matters.` });
    if (issue.recommendation.trim().length < 30) findings.push({ code: "issue.recommendation_weak", message: `Issue ${index + 1} needs an actionable recommendation.` });
    if (issue.actions.some((action) => action.trim().length < 8)) findings.push({ code: "issue.action_vague", message: `Issue ${index + 1} contains a vague action.` });
  });

  const priorities = new Set(review.issues.map((issue) => issue.priority));
  review.checklist.forEach((item, index) => {
    if (!priorities.has(item.priority)) findings.push({ code: "checklist.priority_drift", message: `Checklist item ${index + 1} has no matching issue priority.` });
  });

  const averageScore = review.scores.reduce((total, item) => total + item.score, 0) / review.scores.length;
  if (Math.abs(averageScore - review.overallScore) > 2) findings.push({ code: "score.large_mismatch", message: "Overall score is not reasonably aligned with category scores." });
  return findings;
}

export function assertReviewQuality(review: ReviewOutput): ReviewOutput {
  const findings = inspectReviewQuality(review);
  if (findings.length) throw new Error(`Review quality check failed: ${findings.map((finding) => finding.code).join(", ")}`);
  return review;
}
