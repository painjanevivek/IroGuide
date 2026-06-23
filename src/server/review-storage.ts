import { FieldValue } from "firebase-admin/firestore";
import type { ReviewCategory, ReviewOutput } from "@/domain/review";
import { createStoredReviewDocument, type StoredReviewDocument } from "@/domain/review-storage";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const REVIEWS_COLLECTION = "reviews";

export type ReviewSaveResult = {
  savedIds: string[];
  failedIds: string[];
};

export async function saveReviewForUser({
  category,
  review,
  userId,
}: {
  category: ReviewCategory;
  review: ReviewOutput;
  userId: string;
}) {
  const document = createStoredReviewDocument({ userId, review, category, syncState: "cloud" });
  await writeReviewDocument(document);
  return document;
}

export async function syncReviewDocumentsForUser(userId: string, documents: StoredReviewDocument[]): Promise<ReviewSaveResult> {
  const results = await Promise.allSettled(documents.map(async (document) => {
    const normalizedDocument = createStoredReviewDocument({
      userId,
      review: document.review,
      category: document.category,
      savedAt: document.savedAt,
      syncState: "cloud",
    });
    await writeReviewDocument(normalizedDocument);
    return normalizedDocument.id;
  }));

  return results.reduce<ReviewSaveResult>((summary, result, index) => {
    if (result.status === "fulfilled") {
      summary.savedIds.push(result.value);
    } else {
      summary.failedIds.push(documents[index]?.id ?? "unknown");
    }
    return summary;
  }, { savedIds: [], failedIds: [] });
}

async function writeReviewDocument(document: StoredReviewDocument) {
  await getFirebaseAdminFirestore()
    .collection(REVIEWS_COLLECTION)
    .doc(document.id)
    .set({
      ...document,
      syncState: "cloud",
      savedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}
