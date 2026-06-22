import type { ComparisonOutput, ComparisonRequest } from "./comparison";

export function createDemoComparison(request: ComparisonRequest): ComparisonOutput {
  const highPriorityIssue = request.originalReview.issues.find((issue) => issue.priority === "high")
    ?? request.originalReview.issues[0];
  const remainingIssue = request.originalReview.issues.find((issue) => issue.id !== highPriorityIssue?.id)
    ?? highPriorityIssue;
  const revisedScore = Math.min(10, Number((request.originalReview.overallScore + 0.8).toFixed(1)));

  return {
    id: `comparison-${stableHash(`${request.originalReview.id}:${request.revisedFile.name}`)}`,
    createdAt: new Date().toISOString(),
    originalReviewId: request.originalReview.id,
    revisedUploadId: `revised-${stableHash(`${request.revisedFile.name}:${request.revisedFile.size}`)}`,
    originalScore: request.originalReview.overallScore,
    revisedScore,
    scoreDelta: Number((revisedScore - request.originalReview.overallScore).toFixed(1)),
    summary: `The revised version appears more focused than the original demo critique baseline, especially around ${highPriorityIssue?.category.toLowerCase() ?? "the top priority"}.`,
    improved: [
      highPriorityIssue?.recommendation ?? "The primary critique direction has been addressed more clearly.",
      "The revised upload gives the comparison flow a separate artifact without changing the original review.",
    ],
    remainingIssues: [
      remainingIssue?.recommendation ?? "Continue checking the revised version against the original audience and goal.",
    ],
    regressions: [
      "No critical regression is simulated in this demo comparison. A live vision adapter should inspect the revised pixels before production use.",
    ],
    nextAction: highPriorityIssue?.actions[0] ?? "Compare the revised design at thumbnail size before making another round of changes.",
    provider: "demo",
  };
}

function stableHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
