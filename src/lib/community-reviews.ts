import type { DocumentData } from "firebase/firestore";
import { categoryLabels, reviewOutputSchema, type ReviewCategory, type ReviewOutput } from "@/domain/review";
import { getReviewTrustState, type ReviewTrustState } from "@/domain/review-storage";

export type CommunitySavedReview = {
  savedDocId: string;
  category: ReviewCategory;
  categoryLabel: string;
  review: ReviewOutput;
  trustState: ReviewTrustState;
};

export function toCommunitySavedReview(id: string, data: DocumentData): CommunitySavedReview | null {
  const candidate = data.review ?? data;
  const parsed = reviewOutputSchema.safeParse({ ...candidate, id: candidate.id ?? id });
  if (!parsed.success) return null;

  const category = typeof data.category === "string" && data.category in categoryLabels
    ? data.category as ReviewCategory
    : "other";
  const categoryLabel = typeof data.categoryLabel === "string"
    ? data.categoryLabel
    : categoryLabels[category];

  return {
    savedDocId: id,
    category,
    categoryLabel,
    review: parsed.data,
    trustState: getReviewTrustState({
      provenance: data.provenance,
      provider: data.provider,
      review: parsed.data,
      status: data.status,
    }),
  };
}

export function getPublishableCommunityReviews<T extends { trustState: ReviewTrustState }>(reviews: T[]) {
  return reviews.filter((review) => review.trustState === "server-verified");
}
