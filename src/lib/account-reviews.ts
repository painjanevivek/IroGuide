import { limit, type DocumentData, type QueryConstraint, type QueryDocumentSnapshot } from "firebase/firestore";
import { categoryLabels, reviewOutputSchema, reviewSourceImageSchema, type ReviewOutput, type ReviewSourceImage } from "@/domain/review";
import type { ProgressReview } from "@/domain/progress";
import type { StoredReviewDocument } from "@/lib/review-persistence";
import { getCachedReviewDocuments } from "@/lib/review-persistence";

export type AccountStoredReview = ReviewOutput & ProgressReview & {
  category?: string;
  documentId: string;
  sourceImage?: ReviewSourceImage;
  syncState?: StoredReviewDocument["syncState"];
};

export const DEFAULT_ACCOUNT_REVIEW_LIMIT = 12;
export const ACCOUNT_REVIEW_QUERY_LIMIT = 30;

export function accountReviewQueryConstraints(): QueryConstraint[] {
  return [limit(ACCOUNT_REVIEW_QUERY_LIMIT)];
}

export function mapAccountReviewSnapshot(
  docs: Array<QueryDocumentSnapshot<DocumentData>>,
  maxReviews = DEFAULT_ACCOUNT_REVIEW_LIMIT,
) {
  return docs
    .map((reviewDoc) => toAccountStoredReview(reviewDoc.id, reviewDoc.data()))
    .filter((review): review is AccountStoredReview => review !== null)
    .sort(sortReviewsNewestFirst)
    .slice(0, maxReviews);
}

export function toAccountStoredReview(id: string, data: DocumentData): AccountStoredReview | null {
  const candidate = data.review ?? data;
  const parsed = reviewOutputSchema.safeParse({ ...candidate, id: candidate.id ?? id });
  if (!parsed.success) return null;
  const category = typeof data.category === "string" && data.category in categoryLabels
    ? categoryLabels[data.category as keyof typeof categoryLabels]
    : undefined;
  const parsedSourceImage = reviewSourceImageSchema.safeParse(data.sourceImage);
  const syncState = data.syncState === "local" || data.syncState === "cloud" ? data.syncState : undefined;
  return {
    ...parsed.data,
    category,
    documentId: id,
    ...(parsedSourceImage.success ? { sourceImage: parsedSourceImage.data } : {}),
    syncState,
  };
}

export function readCachedAccountReviews(userId: string) {
  return getCachedReviewDocuments(userId)
    .map((document) => toAccountStoredReview(document.id, document))
    .filter((review): review is AccountStoredReview => review !== null);
}

export function mergeAccountReviews(
  cloudReviews: AccountStoredReview[],
  cachedReviews: AccountStoredReview[],
  maxReviews = DEFAULT_ACCOUNT_REVIEW_LIMIT,
) {
  const byId = new Map<string, AccountStoredReview>();
  for (const review of cachedReviews) byId.set(review.id, review);
  for (const review of cloudReviews) byId.set(review.id, review);

  return [...byId.values()].sort(sortReviewsNewestFirst).slice(0, maxReviews);
}

export function hasCachedOnlyAccountReviews(cloudReviews: AccountStoredReview[], cachedReviews: AccountStoredReview[]) {
  return cachedReviews.some(
    (cachedReview) => cachedReview.syncState === "local"
      && !cloudReviews.some((cloudReview) => cloudReview.id === cachedReview.id),
  );
}

function sortReviewsNewestFirst(left: AccountStoredReview, right: AccountStoredReview) {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}
