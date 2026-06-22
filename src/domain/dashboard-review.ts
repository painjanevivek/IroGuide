import type { ReviewOutput } from "./review";

export type DashboardReviewSummary = {
  id: string;
  category: string;
  score: number;
  dateLabel: string;
  summary: string;
  strongestArea: string;
  fixFirst: string;
  firstAction: string;
};

type SummarizableReview = Pick<ReviewOutput, "id" | "createdAt" | "overallScore" | "summary" | "scores" | "issues"> & {
  category?: string;
};

const priorityWeight = { high: 0, medium: 1, low: 2 } as const;

export function getRecentReviewSummary(reviews: SummarizableReview[]): DashboardReviewSummary | null {
  const latestReview = getLatestReview(reviews);
  if (!latestReview) return null;

  const strongestArea = [...latestReview.scores].sort((left, right) => right.score - left.score)[0]?.label ?? "Not enough data";
  const priorityIssue = getTopPriorityIssue(latestReview);
  const firstAction = priorityIssue?.actions[0] ?? priorityIssue?.recommendation ?? "Review the critique and choose one focused next change.";

  return {
    id: latestReview.id,
    category: latestReview.category ?? "Design review",
    score: latestReview.overallScore,
    dateLabel: formatReviewDate(latestReview.createdAt),
    summary: toOneLine(latestReview.summary),
    strongestArea,
    fixFirst: priorityIssue?.category ?? "Next improvement",
    firstAction,
  };
}

function getLatestReview(reviews: SummarizableReview[]) {
  return [...reviews].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0] ?? null;
}

function getTopPriorityIssue(review: SummarizableReview) {
  return [...review.issues].sort((left, right) => {
    const priorityDelta = priorityWeight[left.priority] - priorityWeight[right.priority];
    return priorityDelta === 0 ? left.score - right.score : priorityDelta;
  })[0] ?? null;
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function toOneLine(value: string) {
  const [firstSentence] = value.replace(/\s+/g, " ").trim().split(/(?<=\.)\s+/);
  return firstSentence || value;
}
