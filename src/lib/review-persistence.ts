import { categoryLabels, reviewOutputSchema, type ReviewCategory, type ReviewOutput } from "@/domain/review";

const REVIEW_CACHE_KEY_PREFIX = "iroguide:dashboard-reviews:v1:";
const MAX_CACHED_REVIEWS = 30;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type StoredReviewDocument = {
  id: string;
  userId: string;
  review: ReviewOutput;
  category: ReviewCategory;
  categoryLabel: string;
  provider: ReviewOutput["provider"];
  status: "complete";
  savedAt: string;
  updatedAt: string;
  syncState: "local" | "cloud";
};

export function getReviewDocumentId(userId: string, reviewId: string) {
  return `${sanitizeDocumentId(userId)}_${sanitizeDocumentId(reviewId)}`;
}

export function createStoredReviewDocument({
  category,
  review,
  savedAt = new Date().toISOString(),
  syncState = "local",
  userId,
}: {
  category: ReviewCategory;
  review: ReviewOutput;
  savedAt?: string;
  syncState?: StoredReviewDocument["syncState"];
  userId: string;
}): StoredReviewDocument {
  return {
    id: getReviewDocumentId(userId, review.id),
    userId,
    review,
    category,
    categoryLabel: categoryLabels[category],
    provider: review.provider,
    status: "complete",
    savedAt,
    updatedAt: savedAt,
    syncState,
  };
}

export function cacheReviewDocument(document: StoredReviewDocument, storage: StorageLike | null = getBrowserStorage()) {
  if (!storage) return false;

  const currentDocuments = getCachedReviewDocuments(document.userId, storage);
  const nextDocuments = [document, ...currentDocuments.filter((item) => item.id !== document.id)]
    .sort((left, right) => Date.parse(right.review.createdAt) - Date.parse(left.review.createdAt))
    .slice(0, MAX_CACHED_REVIEWS);

  try {
    storage.setItem(getReviewCacheKey(document.userId), JSON.stringify(nextDocuments));
    return true;
  } catch {
    return false;
  }
}

export function getCachedReviewDocuments(userId: string, storage: StorageLike | null = getBrowserStorage()) {
  if (!storage) return [];

  try {
    const rawValue = storage.getItem(getReviewCacheKey(userId));
    if (!rawValue) return [];
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => storedReviewDocumentSchema(item))
      .filter((item): item is StoredReviewDocument => item !== null)
      .filter((item) => item.userId === userId)
      .slice(0, MAX_CACHED_REVIEWS);
  } catch {
    return [];
  }
}

function storedReviewDocumentSchema(value: unknown): StoredReviewDocument | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<StoredReviewDocument>;
  if (typeof candidate.id !== "string" || typeof candidate.userId !== "string") return null;
  if (candidate.status !== "complete") return null;
  if (candidate.syncState !== "local" && candidate.syncState !== "cloud") return null;
  if (typeof candidate.savedAt !== "string" || typeof candidate.updatedAt !== "string") return null;
  if (typeof candidate.category !== "string" || !(candidate.category in categoryLabels)) return null;

  const parsedReview = reviewOutputSchema.safeParse(candidate.review);
  if (!parsedReview.success) return null;

  return {
    id: candidate.id,
    userId: candidate.userId,
    review: parsedReview.data,
    category: candidate.category as ReviewCategory,
    categoryLabel: categoryLabels[candidate.category as ReviewCategory],
    provider: parsedReview.data.provider,
    status: "complete",
    savedAt: candidate.savedAt,
    updatedAt: candidate.updatedAt,
    syncState: candidate.syncState,
  };
}

function getReviewCacheKey(userId: string) {
  return `${REVIEW_CACHE_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function sanitizeDocumentId(value: string) {
  return value.trim().replaceAll("/", "_").replace(/[^\w.-]/g, "_").slice(0, 320) || "review";
}
