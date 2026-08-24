export type ProgressDimensionScore = {
  label: string;
  score: number;
};

export type ProgressReview = {
  overallScore: number;
  createdAt: string;
  scores: ProgressDimensionScore[];
  issues?: Array<{ category: string }>;
};

export type ProgressSummary = {
  totalReviews: number;
  averageScore: number;
  scoreChange: number | null;
  strongest: ProgressDimensionScore | null;
  weakest: ProgressDimensionScore | null;
  lesson: string;
  insights: string[];
  evidenceState: "empty" | "baseline" | "comparable";
  recurringIssues: Array<{ category: string; count: number }>;
};

const emptyProgressSummary: ProgressSummary = {
  totalReviews: 0,
  averageScore: 0,
  scoreChange: null,
  strongest: null,
  weakest: null,
  lesson: "Complete a first review to unlock a personalized practice suggestion.",
  insights: [],
  evidenceState: "empty",
  recurringIssues: [],
};

export function calculateProgress(reviews: readonly ProgressReview[]): ProgressSummary {
  if (reviews.length === 0) {
    return emptyProgressSummary;
  }

  const chronologicalReviews = [...reviews].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const hasComparableSample = reviews.length >= 2;
  const dimensionAverages = hasComparableSample ? getDimensionAverages(reviews) : [];
  const weakest = dimensionAverages.length > 0 ? dimensionAverages[dimensionAverages.length - 1] : null;
  const strongest = dimensionAverages[0] ?? null;
  const scoreChange = getScoreChange(chronologicalReviews);

  return {
    totalReviews: reviews.length,
    averageScore: roundToOneDecimal(average(reviews.map((review) => review.overallScore))),
    scoreChange,
    strongest,
    weakest,
    lesson: getPracticeLesson(weakest),
    insights: getProgressInsights({ totalReviews: reviews.length, scoreChange, strongest, weakest }),
    evidenceState: hasComparableSample ? "comparable" : "baseline",
    recurringIssues: hasComparableSample ? getRecurringIssues(reviews) : [],
  };
}

function getRecurringIssues(reviews: readonly ProgressReview[]) {
  const counts = new Map<string, number>();
  for (const review of reviews) {
    const categories = new Set(review.issues?.map((issue) => issue.category.trim()).filter(Boolean) ?? []);
    for (const category of categories) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts]
    .filter(([, count]) => count >= 2)
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
}

function getDimensionAverages(reviews: readonly ProgressReview[]): ProgressDimensionScore[] {
  const dimensions = new Map<string, number[]>();

  for (const review of reviews) {
    for (const item of review.scores) {
      const scores = dimensions.get(item.label) ?? [];
      dimensions.set(item.label, [...scores, item.score]);
    }
  }

  return Array.from(dimensions, ([label, scores]) => ({
    label,
    score: roundToOneDecimal(average(scores)),
  })).sort((a, b) => b.score - a.score);
}

function getScoreChange(chronologicalReviews: readonly ProgressReview[]): number | null {
  const firstReview = chronologicalReviews[0];
  const latestReview = chronologicalReviews.length > 0
    ? chronologicalReviews[chronologicalReviews.length - 1]
    : undefined;

  if (!firstReview || !latestReview || chronologicalReviews.length < 2) {
    return null;
  }

  return roundToOneDecimal(latestReview.overallScore - firstReview.overallScore);
}

function getPracticeLesson(weakest: ProgressDimensionScore | null): string {
  if (!weakest) {
    return "Complete another review to identify a focused practice area.";
  }

  return `Practice ${weakest.label.toLowerCase()} by creating one version with fewer elements and one unmistakable focal point. Compare it against your original at thumbnail size.`;
}

function getProgressInsights({
  totalReviews,
  scoreChange,
  strongest,
  weakest,
}: Pick<ProgressSummary, "totalReviews" | "scoreChange" | "strongest" | "weakest">): string[] {
  if (totalReviews === 0) {
    return [];
  }

  if (totalReviews === 1) {
    return [
      "This first critique is your baseline. Complete one more review to unlock trend language.",
      "Strengths and practice recommendations require two compatible, server-verified reviews.",
    ];
  }

  return [
    scoreChange === null
      ? "Your score trend needs one more dated review to become reliable."
      : `Your overall score changed by ${scoreChange >= 0 ? "+" : ""}${scoreChange} points from first to latest review.`,
    strongest ? `${strongest.label} is your recurring strength at ${strongest.score}/10 average.` : "No recurring strength is available yet.",
    weakest ? `${weakest.label} is your recurring weak spot at ${weakest.score}/10 average.` : "No recurring weak spot is available yet.",
  ];
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToOneDecimal(value: number): number {
  return Number(value.toFixed(1));
}
