import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { ReviewCategory, ReviewOutput, ReviewRequest, ReviewSourceImage } from "@/domain/review";
import {
  createImportedReviewDocument,
  type ImportedReviewDocument,
  type TrustedStoredReviewDocument,
} from "@/domain/review-storage";
import {
  ACCOUNT_DELETION_LOCKS_COLLECTION,
  assertAccountDeletionUnlocked,
  assertAccountDeletionUnlockedInTransaction,
} from "./account-deletion-lock";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "./firebase-admin";
import { getServerLaunchCapabilities } from "./launch-capabilities";
import { createTrustedReviewDocument } from "./review-provenance";

const REVIEWS_COLLECTION = "reviews";
const REVIEW_DRAFTS_COLLECTION = "reviewDrafts";
const REVIEW_FEEDBACK_COLLECTION = "reviewFeedback";
const REVIEW_PIPELINE_COLLECTIONS = [
  "reviewJobs",
  "reviewJobOutbox",
  "providerUsageReservations",
  "providerUsageAggregates",
] as const;
const FIRESTORE_BATCH_LIMIT = 450;

export type ReviewSaveResult = {
  savedIds: string[];
  failedIds: string[];
  sourceImages: Array<{ id: string; sourceImage: ReviewSourceImage }>;
};

export type ReviewDeleteResult = {
  draftsDeleted: number;
  failures: ReviewDeleteFailure[];
  feedbackDeleted: number;
  reviewsDeleted: number;
  pipelineDocumentsDeleted: number;
  retryToken?: string;
  sourceImagesDeleted: number;
  stagingImagesDeleted: number;
  status: "complete" | "retry-required";
};

export type ReviewDeleteFailure = {
  operation: "deletion-lock" | "drafts" | "feedback" | "pipeline-documents" | "reviews" | "source-images" | "staging-images";
  reason: string;
};

export class ReviewDeletionIncompleteError extends Error {
  constructor(readonly result: ReviewDeleteResult) {
    super("Review data deletion is incomplete and can be retried safely.");
    this.name = "ReviewDeletionIncompleteError";
  }
}

export async function saveReviewForUser({
  category,
  documentId,
  review,
  sourceImage,
  userId,
}: {
  category: ReviewCategory;
  documentId?: string;
  review: ReviewOutput;
  sourceImage?: ReviewSourceImageUpload;
  userId: string;
}) {
  await assertAccountDeletionUnlocked(userId);
  const capabilities = getServerLaunchCapabilities();
  const createdDocument = createTrustedReviewDocument({ userId, review, category });
  const baseDocument = documentId ? { ...createdDocument, id: documentId } : createdDocument;
  const persistedSourceImage = sourceImage && capabilities.sourceImageStorage
    ? await uploadReviewSourceImage({ documentId: baseDocument.id, sourceImage, userId })
    : undefined;
  const document = persistedSourceImage ? { ...baseDocument, sourceImage: persistedSourceImage } : baseDocument;
  try {
    await writeReviewDocument(document);
  } catch (error) {
    if (persistedSourceImage) await deletePersistedSourceImage(persistedSourceImage.storagePath);
    throw error;
  }
  return document;
}

export async function syncReviewDocumentsForUser(userId: string, documents: ReviewSyncDocumentInput[]): Promise<ReviewSaveResult> {
  await assertAccountDeletionUnlocked(userId);
  const capabilities = getServerLaunchCapabilities();
  const results = await Promise.allSettled(documents.map(async (input) => {
    const { document, sourceImage } = normalizeSyncDocumentInput(input);
    const normalizedDocument = createImportedReviewDocument({
      userId,
      review: document.review,
      category: document.category,
      savedAt: document.savedAt,
      syncState: "cloud",
    });
    const persistedSourceImage = sourceImage && capabilities.sourceImageStorage
      ? await uploadReviewSourceImage({ documentId: normalizedDocument.id, sourceImage, userId })
      : undefined;
    const documentToWrite = persistedSourceImage
      ? { ...normalizedDocument, sourceImage: persistedSourceImage }
      : normalizedDocument;

    try {
      await writeImportedReviewDocument(documentToWrite);
    } catch (error) {
      if (persistedSourceImage) await deletePersistedSourceImage(persistedSourceImage.storagePath);
      throw error;
    }
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

type ReviewSyncDocumentInput = ImportedReviewDocument | {
  document: ImportedReviewDocument;
  sourceImage?: ReviewSourceImageUpload;
};

export async function deleteReviewDataForUser(
  userId: string,
  { retainDeletionLock = false }: { retainDeletionLock?: boolean } = {},
): Promise<ReviewDeleteResult> {
  const db = await getFirebaseAdminFirestore();
  try {
    await db.collection(ACCOUNT_DELETION_LOCKS_COLLECTION).doc(userId).set({
      schemaVersion: 1,
      state: "deleting",
      updatedAt: new Date().toISOString(),
      userId,
    }, { merge: true });
  } catch (error) {
    const result: ReviewDeleteResult = {
      draftsDeleted: 0,
      failures: [{ operation: "deletion-lock", reason: toDeletionFailureReason(error) }],
      feedbackDeleted: 0,
      pipelineDocumentsDeleted: 0,
      reviewsDeleted: 0,
      retryToken: randomUUID(),
      sourceImagesDeleted: 0,
      stagingImagesDeleted: 0,
      status: "retry-required",
    };
    throw new ReviewDeletionIncompleteError(result);
  }
  const operations = await Promise.allSettled([
    deleteDocumentsForUser(db, REVIEWS_COLLECTION, userId),
    deleteDocumentsForUser(db, REVIEW_DRAFTS_COLLECTION, userId),
    deleteDocumentsForUser(db, REVIEW_FEEDBACK_COLLECTION, userId),
    deleteReviewPipelineDocumentsForUser(db, userId),
    // Deletion is intentionally independent of the current creation capability:
    // a free-profile account may still own images created under a former profile.
    deleteReviewSourceImagesForUser(userId),
    deleteReviewStagingImagesForUser(userId),
  ] as const);
  const names: ReviewDeleteFailure["operation"][] = [
    "reviews",
    "drafts",
    "feedback",
    "pipeline-documents",
    "source-images",
    "staging-images",
  ];
  const failures = operations.flatMap((operation, index) => operation.status === "rejected"
    ? [{ operation: names[index], reason: toDeletionFailureReason(operation.reason) }]
    : []);
  const result: ReviewDeleteResult = {
    reviewsDeleted: getSettledCount(operations[0]),
    draftsDeleted: getSettledCount(operations[1]),
    feedbackDeleted: getSettledCount(operations[2]),
    pipelineDocumentsDeleted: getSettledCount(operations[3]),
    sourceImagesDeleted: getSettledCount(operations[4]),
    stagingImagesDeleted: getSettledCount(operations[5]),
    failures,
    status: failures.length === 0 ? "complete" : "retry-required",
    ...(failures.length > 0 ? { retryToken: randomUUID() } : {}),
  };

  if (failures.length > 0) throw new ReviewDeletionIncompleteError(result);
  if (!retainDeletionLock) await db.collection(ACCOUNT_DELETION_LOCKS_COLLECTION).doc(userId).delete();
  return result;
}

async function writeReviewDocument(document: TrustedStoredReviewDocument) {
  const [{ FieldValue }, db] = await Promise.all([
    import("firebase-admin/firestore"),
    getFirebaseAdminFirestore(),
  ]);

  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: document.userId });
    transaction.set(db.collection(REVIEWS_COLLECTION).doc(document.id), {
      ...document,
      syncState: "cloud",
      savedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function writeImportedReviewDocument(document: ImportedReviewDocument & { sourceImage?: ReviewSourceImage }) {
  const [{ FieldValue }, db] = await Promise.all([
    import("firebase-admin/firestore"),
    getFirebaseAdminFirestore(),
  ]);

  await db.runTransaction(async (transaction) => {
    await assertAccountDeletionUnlockedInTransaction({ db, transaction, userId: document.userId });
    transaction.set(db.collection(REVIEW_DRAFTS_COLLECTION).doc(document.id), {
      ...document,
      syncState: "cloud",
      savedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
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

async function deletePersistedSourceImage(storagePath: string) {
  const bucket = await getFirebaseAdminStorageBucket();
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}

function getReviewSourceImagePath(userId: string, documentId: string, mimeType: ReviewSourceImageUpload["image"]["mimeType"]) {
  return `users/${userId}/reviews/${documentId}/source.${getImageExtension(mimeType)}`;
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
  let deleted = 0;
  while (true) {
    const snapshot = await db.collection(collectionName)
      .where("userId", "==", userId)
      .limit(FIRESTORE_BATCH_LIMIT)
      .get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
    }
    await batch.commit();
    deleted += snapshot.docs.length;
    if (snapshot.docs.length < FIRESTORE_BATCH_LIMIT) break;
  }

  return deleted;
}

async function deleteReviewSourceImagesForUser(userId: string) {
  return deleteStoragePrefix(`users/${userId}/reviews/`);
}

async function deleteReviewStagingImagesForUser(userId: string) {
  return deleteStoragePrefix(`users/${userId}/review-uploads/`);
}

async function deleteStoragePrefix(prefix: string) {
  const bucket = await getFirebaseAdminStorageBucket();
  let deleted = 0;
  while (true) {
    const [files] = await bucket.getFiles({
      maxResults: 100,
      prefix,
    });
    if (files.length === 0) break;
    await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
    deleted += files.length;
    if (files.length < 100) break;
  }
  return deleted;
}

async function deleteReviewPipelineDocumentsForUser(
  db: Awaited<ReturnType<typeof getFirebaseAdminFirestore>>,
  userId: string,
) {
  const now = new Date();
  const sessions = await db.collection("reviewUploadSessions").where("userId", "==", userId).get();
  const unexpiredCapabilities = sessions.docs.filter((document) => {
    const value = document.data();
    return typeof value.expiresAt === "string" && Date.parse(value.expiresAt) > now.getTime();
  });
  if (unexpiredCapabilities.length > 0) {
    for (let offset = 0; offset < unexpiredCapabilities.length; offset += FIRESTORE_BATCH_LIMIT) {
      const batch = db.batch();
      for (const document of unexpiredCapabilities.slice(offset, offset + FIRESTORE_BATCH_LIMIT)) {
        batch.update(document.ref, { failureClass: "revoked", state: "rejected", updatedAt: now.toISOString() });
      }
      await batch.commit();
    }
  }
  const results = await Promise.all(REVIEW_PIPELINE_COLLECTIONS.map((collection) => deleteDocumentsForUser(db, collection, userId)));
  if (unexpiredCapabilities.length > 0) {
    const error = new Error("Signed upload capabilities must expire before account deletion can finish.");
    error.name = "ActiveUploadCapability";
    throw error;
  }
  await deleteDocumentReferences(db, sessions.docs.map((document) => document.ref));
  return sessions.docs.length + results.reduce((total, count) => total + count, 0);
}

async function deleteDocumentReferences(
  db: Awaited<ReturnType<typeof getFirebaseAdminFirestore>>,
  references: FirebaseFirestore.DocumentReference[],
) {
  for (let offset = 0; offset < references.length; offset += FIRESTORE_BATCH_LIMIT) {
    const batch = db.batch();
    for (const reference of references.slice(offset, offset + FIRESTORE_BATCH_LIMIT)) batch.delete(reference);
    await batch.commit();
  }
}

function getSettledCount(result: PromiseSettledResult<number>) {
  return result.status === "fulfilled" ? result.value : 0;
}

function toDeletionFailureReason(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  return error.name.replace(/[^a-z0-9_-]/gi, "-").toLowerCase().slice(0, 80) || "error";
}
