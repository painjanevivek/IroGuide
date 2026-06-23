import { Buffer } from "node:buffer";
import type { ReviewCategory, ReviewOutput, ReviewRequest, ReviewSourceImage } from "@/domain/review";
import { createStoredReviewDocument, type StoredReviewDocument } from "@/domain/review-storage";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "./firebase-admin";

const REVIEWS_COLLECTION = "reviews";
const REVIEW_DRAFTS_COLLECTION = "reviewDrafts";
const FIRESTORE_BATCH_LIMIT = 450;

export type ReviewSaveResult = {
  savedIds: string[];
  failedIds: string[];
  sourceImages: Array<{ id: string; sourceImage: ReviewSourceImage }>;
};

export type ReviewDeleteResult = {
  draftsDeleted: number;
  reviewsDeleted: number;
  sourceImagesDeleted: number;
};

export async function saveReviewForUser({
  category,
  review,
  sourceImage,
  userId,
}: {
  category: ReviewCategory;
  review: ReviewOutput;
  sourceImage?: ReviewSourceImageUpload;
  userId: string;
}) {
  const baseDocument = createStoredReviewDocument({ userId, review, category, syncState: "cloud" });
  const persistedSourceImage = sourceImage
    ? await uploadReviewSourceImage({ documentId: baseDocument.id, sourceImage, userId })
    : undefined;
  const document = persistedSourceImage ? { ...baseDocument, sourceImage: persistedSourceImage } : baseDocument;
  await writeReviewDocument(document);
  return document;
}

export async function syncReviewDocumentsForUser(userId: string, documents: ReviewSyncDocumentInput[]): Promise<ReviewSaveResult> {
  const results = await Promise.allSettled(documents.map(async (input) => {
    const { document, sourceImage } = normalizeSyncDocumentInput(input);
    const normalizedDocument = createStoredReviewDocument({
      userId,
      review: document.review,
      category: document.category,
      savedAt: document.savedAt,
      syncState: "cloud",
    });
    const persistedSourceImage = sourceImage
      ? await uploadReviewSourceImage({ documentId: normalizedDocument.id, sourceImage, userId })
      : undefined;
    const documentToWrite = persistedSourceImage
      ? { ...normalizedDocument, sourceImage: persistedSourceImage }
      : normalizedDocument;

    await writeReviewDocument(documentToWrite);
    return { id: normalizedDocument.id, sourceImage: persistedSourceImage };
  }));

  return results.reduce<ReviewSaveResult>((summary, result, index) => {
    if (result.status === "fulfilled") {
      summary.savedIds.push(result.value.id);
      if (result.value.sourceImage) {
        summary.sourceImages.push({ id: result.value.id, sourceImage: result.value.sourceImage });
      }
    } else {
      summary.failedIds.push(getSyncInputDocumentId(documents[index]) ?? "unknown");
    }
    return summary;
  }, { savedIds: [], failedIds: [], sourceImages: [] });
}

export type ReviewSourceImageUpload = {
  file: ReviewRequest["file"];
  image: NonNullable<ReviewRequest["image"]>;
};

type ReviewSyncDocumentInput = StoredReviewDocument | {
  document: StoredReviewDocument;
  sourceImage?: ReviewSourceImageUpload;
};

export async function deleteReviewDataForUser(userId: string): Promise<ReviewDeleteResult> {
  const db = await getFirebaseAdminFirestore();
  const [reviewsDeleted, draftsDeleted, sourceImagesDeleted] = await Promise.all([
    deleteDocumentsForUser(db, REVIEWS_COLLECTION, userId),
    deleteDocumentsForUser(db, REVIEW_DRAFTS_COLLECTION, userId),
    deleteReviewSourceImagesForUser(userId),
  ]);

  return { draftsDeleted, reviewsDeleted, sourceImagesDeleted };
}

async function writeReviewDocument(document: StoredReviewDocument) {
  const [{ FieldValue }, db] = await Promise.all([
    import("firebase-admin/firestore"),
    getFirebaseAdminFirestore(),
  ]);

  await db.collection(REVIEWS_COLLECTION)
    .doc(document.id)
    .set({
      ...document,
      syncState: "cloud",
      savedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}

async function uploadReviewSourceImage({
  documentId,
  sourceImage,
  userId,
}: {
  documentId: string;
  sourceImage: ReviewSourceImageUpload;
  userId: string;
}): Promise<ReviewSourceImage> {
  const bucket = await getFirebaseAdminStorageBucket();
  const bytes = Buffer.from(sourceImage.image.dataBase64, "base64");
  const storagePath = getReviewSourceImagePath(userId, documentId, sourceImage.image.mimeType);
  const uploadedAt = new Date().toISOString();

  await bucket.file(storagePath).save(bytes, {
    resumable: false,
    metadata: {
      contentType: sourceImage.image.mimeType,
      cacheControl: "private, max-age=300",
      metadata: {
        userId,
        reviewDocumentId: documentId,
        originalName: sourceImage.file.name,
      },
    },
  });

  return {
    storagePath,
    contentType: sourceImage.image.mimeType,
    size: bytes.byteLength,
    originalName: sourceImage.file.name,
    uploadedAt,
  };
}

function getReviewSourceImagePath(userId: string, documentId: string, mimeType: ReviewSourceImageUpload["image"]["mimeType"]) {
  return `users/${userId}/reviews/${documentId}/source.${getImageExtension(mimeType)}`;
}

function getUserReviewSourceImagePrefix(userId: string) {
  return `users/${userId}/reviews/`;
}

function getImageExtension(mimeType: ReviewSourceImageUpload["image"]["mimeType"]) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

function normalizeSyncDocumentInput(input: ReviewSyncDocumentInput) {
  return "document" in input ? input : { document: input };
}

function getSyncInputDocumentId(input: ReviewSyncDocumentInput | undefined) {
  if (!input) return undefined;
  return "document" in input ? input.document.id : input.id;
}

async function deleteDocumentsForUser(db: Awaited<ReturnType<typeof getFirebaseAdminFirestore>>, collectionName: string, userId: string) {
  const snapshot = await db.collection(collectionName).where("userId", "==", userId).get();
  if (snapshot.empty) return 0;

  let deleted = 0;
  for (let start = 0; start < snapshot.docs.length; start += FIRESTORE_BATCH_LIMIT) {
    const batch = db.batch();
    const docs = snapshot.docs.slice(start, start + FIRESTORE_BATCH_LIMIT);
    for (const document of docs) {
      batch.delete(document.ref);
    }
    await batch.commit();
    deleted += docs.length;
  }

  return deleted;
}

async function deleteReviewSourceImagesForUser(userId: string) {
  const bucket = await getFirebaseAdminStorageBucket();
  const [files] = await bucket.getFiles({ prefix: getUserReviewSourceImagePrefix(userId) });
  await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
  return files.length;
}
