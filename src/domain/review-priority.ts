import type { ReviewOutput } from "./review";

export type FixFirstAction = {
  issueCategory: string;
  action: string;
  reason: string;
  priority: ReviewOutput["issues"][number]["priority"];
};

const priorityWeight = { high: 0, medium: 1, low: 2 } as const;

export function getFixFirstAction(review: Pick<ReviewOutput, "issues">): FixFirstAction | null {
  const issue = [...review.issues].sort((left, right) => {
    const priorityDelta = priorityWeight[left.priority] - priorityWeight[right.priority];
    return priorityDelta === 0 ? left.score - right.score : priorityDelta;
  })[0];

  if (!issue) return null;

  return {
    issueCategory: issue.category,
    action: issue.actions[0] ?? issue.recommendation,
    reason: issue.impact,
    priority: issue.priority,
  };
}
