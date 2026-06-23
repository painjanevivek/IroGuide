import type { ReviewOutput } from "./review";
import { getFixFirstAction } from "./review-priority";

export type DashboardReviewSummary = {
  id: string;
  category: string;
  score: number;
  dateLabel: string;
  summary: string;
  strongestArea: string;
  fixFirst: string;
  firstAction: string;
  sourceImageSaved: boolean;
};

type SummarizableReview = Pick<ReviewOutput, "id" | "createdAt" | "overallScore" | "summary" | "scores" | "issues"> & {
  category?: string;
  sourceImage?: unknown;
};

export function getRecentReviewSummary(reviews: SummarizableReview[]): DashboardReviewSummary | null {
  const latestReview = getLatestReview(reviews);
  if (!latestReview) return null;

  const strongestArea = [...latestReview.scores].sort((left, right) => right.score - left.score)[0]?.label ?? "Not enough data";
  const fixFirst = getFixFirstAction(latestReview);
  const firstAction = fixFirst?.action ?? "Review the critique and choose one focused next change.";

  return {
    id: latestReview.id,
    category: latestReview.category ?? "Design review",
    score: latestReview.overallScore,
    dateLabel: formatReviewDate(latestReview.createdAt),
    summary: toOneLine(latestReview.summary),
    strongestArea,
    fixFirst: fixFirst?.issueCategory ?? "Next improvement",
    firstAction,
    sourceImageSaved: Boolean(latestReview.sourceImage),
  };
}

function getLatestReview(reviews: SummarizableReview[]) {
  return [...reviews].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0] ?? null;
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
