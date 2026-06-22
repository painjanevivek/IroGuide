export type ProgressReview = { overallScore: number; createdAt: string; scores: Array<{ label: string; score: number }> };
export type ProgressSummary = { totalReviews: number; averageScore: number; scoreChange: number | null; strongest: { label: string; score: number } | null; weakest: { label: string; score: number } | null; lesson: string };

export function calculateProgress(reviews: ProgressReview[]): ProgressSummary {
  if (!reviews.length) return { totalReviews: 0, averageScore: 0, scoreChange: null, strongest: null, weakest: null, lesson: "Complete a first review to unlock a personalized practice suggestion." };
  const chronological = [...reviews].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const dimensions = new Map<string, number[]>();
  reviews.forEach((review) => review.scores.forEach((item) => dimensions.set(item.label, [...(dimensions.get(item.label) ?? []), item.score])));
  const averages = [...dimensions].map(([label, scores]) => ({ label, score: Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) })).sort((a, b) => b.score - a.score);
  const weakest = averages.at(-1) ?? null;
  return { totalReviews: reviews.length, averageScore: Number((reviews.reduce((sum, review) => sum + review.overallScore, 0) / reviews.length).toFixed(1)), scoreChange: reviews.length > 1 ? Number((chronological.at(-1)!.overallScore - chronological[0].overallScore).toFixed(1)) : null, strongest: averages[0] ?? null, weakest, lesson: weakest ? `Practice ${weakest.label.toLowerCase()} by creating one version with fewer elements and one unmistakable focal point. Compare it against your original at thumbnail size.` : "Complete another review to identify a focused practice area." };
}
