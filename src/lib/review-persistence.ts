import { categoryLabels } from "@/domain/review";
import {
  storedReviewDocumentSchema,
  type StoredReviewDocument,
} from "@/domain/review-storage";

export {
  createStoredReviewDocument,
  getReviewDocumentId,
  type StoredReviewDocument,
} from "@/domain/review-storage";

const REVIEW_CACHE_KEY_PREFIX = "iroguide:dashboard-reviews:v1:";
const MAX_CACHED_REVIEWS = 30;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

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
      .map((item) => parseStoredReviewDocument(item))
      .filter((item): item is StoredReviewDocument => item !== null)
      .filter((item) => item.userId === userId)
      .slice(0, MAX_CACHED_REVIEWS);
  } catch {
    return [];
  }
}

export function getPendingLocalReviewDocuments(userId: string, storage: StorageLike | null = getBrowserStorage()) {
  return getCachedReviewDocuments(userId, storage).filter((document) => document.syncState === "local");
}

function parseStoredReviewDocument(value: unknown): StoredReviewDocument | null {
  const parsedReview = storedReviewDocumentSchema.safeParse(value);
  if (!parsedReview.success) return null;
  const document = parsedReview.data;
  if (!(document.category in categoryLabels)) return null;

  return {
    ...document,
    categoryLabel: categoryLabels[document.category],
    provider: document.review.provider,
    status: "complete",
  };
}

function getReviewCacheKey(userId: string) {
  return `${REVIEW_CACHE_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}
