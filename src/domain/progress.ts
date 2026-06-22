export type ProgressDimensionScore = {
  label: string;
  score: number;
};

export type ProgressReview = {
  overallScore: number;
  createdAt: string;
  scores: ProgressDimensionScore[];
};

export type ProgressSummary = {
  totalReviews: number;
  averageScore: number;
  scoreChange: number | null;
  strongest: ProgressDimensionScore | null;
  weakest: ProgressDimensionScore | null;
  lesson: string;
};

const emptyProgressSummary: ProgressSummary = {
  totalReviews: 0,
  averageScore: 0,
  scoreChange: null,
  strongest: null,
  weakest: null,
  lesson: "Complete a first review to unlock a personalized practice suggestion.",
};

export function calculateProgress(reviews: ProgressReview[]): ProgressSummary {
  if (reviews.length === 0) {
    return emptyProgressSummary;
  }

  const chronologicalReviews = [...reviews].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const dimensionAverages = getDimensionAverages(reviews);
  const weakest = dimensionAverages.at(-1) ?? null;

  return {
    totalReviews: reviews.length,
    averageScore: roundToOneDecimal(average(reviews.map((review) => review.overallScore))),
    scoreChange: getScoreChange(chronologicalReviews),
    strongest: dimensionAverages[0] ?? null,
    weakest,
    lesson: getPracticeLesson(weakest),
  };
}

function getDimensionAverages(reviews: ProgressReview[]): ProgressDimensionScore[] {
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

function getScoreChange(chronologicalReviews: ProgressReview[]): number | null {
  const firstReview = chronologicalReviews[0];
  const latestReview = chronologicalReviews.at(-1);

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

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToOneDecimal(value: number): number {
  return Number(value.toFixed(1));
}
