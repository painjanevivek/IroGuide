import { createImportedReviewDocument, reviewSyncResponseSchema } from "@/domain/review-storage";
import { postJsonWithFallback } from "@/lib/api-client";
import {
  cacheReviewDocument,
  getPendingLocalReviewDocuments,
  type StoredReviewDocument,
} from "@/lib/review-persistence";

type AccountReviewSyncInput = {
  getIdToken: () => Promise<string>;
  userId: string;
};

export type AccountReviewSyncResult = {
  attempted: boolean;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
};

export async function syncPendingAccountReviews({
  getIdToken,
  userId,
}: AccountReviewSyncInput): Promise<AccountReviewSyncResult> {
  const pendingDocuments = getPendingLocalReviewDocuments(userId);
  if (pendingDocuments.length === 0) {
    return { attempted: false, failedCount: 0, pendingCount: 0, syncedCount: 0 };
  }

  const idToken = await getIdToken();
  const result = await syncReviewDocumentsToAccount(idToken, pendingDocuments);

  return {
    attempted: true,
    failedCount: result.failedCount,
    pendingCount: pendingDocuments.length,
    syncedCount: result.syncedCount,
  };
}

export async function syncReviewDocumentsToAccount(idToken: string, documents: StoredReviewDocument[]) {
  if (documents.length === 0) return { failedCount: 0, syncedCount: 0 };

  const importDocuments = documents.flatMap((document) => {
    try {
      return [createImportedReviewDocument({
        category: document.category,
        review: document.review,
        savedAt: document.savedAt,
        userId: document.userId,
      })];
    } catch {
      return [];
    }
  });
  const rejectedCount = documents.length - importDocuments.length;
  if (importDocuments.length === 0) {
    return { failedCount: rejectedCount, syncedCount: 0 };
  }

  const payload = await postJsonWithFallback({
    path: "/api/reviews/sync",
    unavailableMessage: "Review sync is not available right now.",
    failureMessage: "Review sync failed.",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documents: importDocuments }),
    },
  });
  const syncResult = reviewSyncResponseSchema.parse(payload);
  const syncedIds = new Set(syncResult.savedIds);
  const sourceImagesById = new Map(syncResult.sourceImages.map((item) => [item.id, item.sourceImage]));

  for (const reviewDocument of documents) {
    if (!syncedIds.has(reviewDocument.id)) continue;
    const sourceImage = sourceImagesById.get(reviewDocument.id) ?? reviewDocument.sourceImage;
    cacheReviewDocument({
      ...reviewDocument,
      ...(sourceImage ? { sourceImage } : {}),
      syncState: "cloud",
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    failedCount: syncResult.failedIds.length + rejectedCount,
    syncedCount: syncResult.savedIds.length,
  };
}
