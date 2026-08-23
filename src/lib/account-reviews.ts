import { documentId, limit, orderBy, startAfter, type DocumentData, type QueryConstraint, type QueryDocumentSnapshot } from "firebase/firestore";
import { categoryLabels, reviewOutputSchema, reviewSourceImageSchema, type ReviewCategory, type ReviewOutput, type ReviewSourceImage } from "@/domain/review";
import type { ProgressReview } from "@/domain/progress";
import { getReviewTrustState, type ReviewTrustState } from "@/domain/review-storage";
import type { StoredReviewDocument } from "@/lib/review-persistence";
import { getCachedReviewDocuments } from "@/lib/review-persistence";

export type AccountStoredReview = ReviewOutput & ProgressReview & {
  category?: ReviewCategory;
  categoryLabel?: string;
  documentId: string;
  sourceImage?: ReviewSourceImage;
  syncState?: StoredReviewDocument["syncState"];
  trustState: ReviewTrustState;
  userId?: string;
};

export const DEFAULT_ACCOUNT_REVIEW_LIMIT = 12;
export const ACCOUNT_REVIEW_QUERY_LIMIT = 30;

export function accountReviewQueryConstraints(cursor?: QueryDocumentSnapshot<DocumentData>): QueryConstraint[] {
  return [
    orderBy("savedAt", "desc"),
    orderBy(documentId(), "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(ACCOUNT_REVIEW_QUERY_LIMIT),
  ];
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
    ? data.category as ReviewCategory
    : undefined;
  const parsedSourceImage = reviewSourceImageSchema.safeParse(data.sourceImage);
  const syncState = data.syncState === "local" || data.syncState === "cloud" ? data.syncState : undefined;
  const userId = typeof data.userId === "string" ? data.userId : undefined;
  return {
    ...parsed.data,
    category,
    ...(category ? { categoryLabel: categoryLabels[category] } : {}),
    documentId: id,
    ...(parsedSourceImage.success ? { sourceImage: parsedSourceImage.data } : {}),
    syncState,
    trustState: getReviewTrustState({
      provenance: data.provenance,
      provider: data.provider,
      review: parsed.data,
      status: data.status,
    }),
    ...(userId ? { userId } : {}),
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

export function isAccountReviewPublishable(review: AccountStoredReview) {
  return review.trustState === "server-verified";
}

export function getProgressEvidence(reviews: AccountStoredReview[]) {
  return getProgressCohort(reviews).evidence;
}

export function getProgressCohort(reviews: AccountStoredReview[]) {
  const verified = reviews
    .filter((review) => review.trustState === "server-verified" && review.category)
    .sort(sortReviewsNewestFirst);
  const anchor = verified[0];
  if (!anchor?.category) return { evidence: [], excludedCount: reviews.length, reason: "No server-verified review with category provenance is available." } as const;
  const anchorDimensions = getDimensionSignature(anchor);

  const evidence = verified.filter((review) => review.category === anchor.category
    && review.provider === anchor.provider
    && review.rubricVersion === anchor.rubricVersion
    && getDimensionSignature(review) === anchorDimensions);
  return {
    evidence,
    excludedCount: reviews.length - evidence.length,
    reason: evidence.length < 2
      ? "Add one more compatible, server-verified review to unlock trend and recurring-area claims."
      : `${evidence.length} compatible ${anchor.categoryLabel ?? anchor.category} reviews use ${anchor.provider} and rubric ${anchor.rubricVersion}.`,
  } as const;
}

function sortReviewsNewestFirst(left: AccountStoredReview, right: AccountStoredReview) {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt)
    || right.documentId.localeCompare(left.documentId);
}

function getDimensionSignature(review: AccountStoredReview) {
  return review.scores.map((score) => score.label.trim().toLowerCase()).sort().join("|");
}
