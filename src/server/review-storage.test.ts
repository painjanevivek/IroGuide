import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoReview } from "@/domain/demo-review";
import { createImportedReviewDocument } from "@/domain/review-storage";
import type { ReviewRequest } from "@/domain/review";
import { deleteReviewDataForUser, ReviewDeletionIncompleteError, saveReviewForUser, syncReviewDocumentsForUser } from "./review-storage";

const firestoreMock = vi.hoisted(() => {
  type QueryDoc = { ref: { path: string } };
  type QuerySnapshot = { docs: QueryDoc[]; empty: boolean };
  const set = vi.fn();
  const doc = vi.fn(() => ({ set }));
  const commit = vi.fn();
  const batchDelete = vi.fn();
  const batch = vi.fn(() => ({ commit, delete: batchDelete }));
  const get = vi.fn<() => Promise<QuerySnapshot>>(() => Promise.resolve({ docs: [], empty: true }));
  const limit = vi.fn(() => ({ get }));
  const where = vi.fn(() => ({ limit }));
  const collection = vi.fn(() => ({ doc, where }));

  return { batch, batchDelete, collection, commit, doc, get, limit, set, where };
});

const firestoreFieldValueMock = vi.hoisted(() => ({
  serverTimestamp: vi.fn(() => ({ __type: "serverTimestamp" })),
}));

const storageMock = vi.hoisted(() => {
  const save = vi.fn();
  const file = vi.fn(() => ({ save }));
  const fileDelete = vi.fn();
  const getFiles = vi.fn<() => Promise<[Array<{ delete: typeof fileDelete }>]>>(() => Promise.resolve([[]]));

  return { file, fileDelete, getFiles, save };
});

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminFirestore: () => ({
    batch: firestoreMock.batch,
    collection: firestoreMock.collection,
  }),
  getFirebaseAdminStorageBucket: () => ({
    file: storageMock.file,
    getFiles: storageMock.getFiles,
  }),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: firestoreFieldValueMock,
}));

const request: ReviewRequest = {
  category: "logo",
  mode: "mentor",
  file: { name: "mark.png", type: "image/png", size: 1024 },
  brief: {
    audience: "Independent designers",
    purpose: "Evaluate a brand mark",
    style: "Bold minimal identity",
    goal: "Improve first impression",
    concern: "",
  },
};

describe("review storage", () => {
  beforeEach(() => {
    vi.stubEnv("IROGUIDE_LAUNCH_PROFILE", "full");
    firestoreMock.collection.mockClear();
    firestoreMock.batch.mockClear();
    firestoreMock.batchDelete.mockClear();
    firestoreMock.commit.mockClear();
    firestoreMock.doc.mockClear();
    firestoreMock.get.mockReset();
    firestoreMock.limit.mockClear();
    firestoreMock.set.mockClear();
    firestoreMock.where.mockClear();
    firestoreFieldValueMock.serverTimestamp.mockClear();
    firestoreMock.get.mockResolvedValue({ docs: [], empty: true });
    storageMock.file.mockClear();
    storageMock.fileDelete.mockClear();
    storageMock.getFiles.mockReset();
    storageMock.getFiles.mockResolvedValue([[]]);
    storageMock.save.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("saves a completed review under the verified user", async () => {
    const review = createDemoReview(request);

    const document = await saveReviewForUser({ userId: "verified-user", review, category: "logo" });

    expect(document.userId).toBe("verified-user");
    expect(firestoreMock.collection).toHaveBeenCalledWith("reviews");
    expect(firestoreMock.doc).toHaveBeenCalledWith(document.id);
    expect(firestoreMock.set).toHaveBeenCalledWith(expect.objectContaining({
      userId: "verified-user",
      category: "logo",
      review,
      syncState: "cloud",
      provenance: expect.objectContaining({
        origin: "server",
        schemaVersion: 1,
        generatedAt: expect.any(String),
      }),
    }), { merge: true });
  });

  it("stores pending sync documents as untrusted imports for the verified user", async () => {
    const review = createDemoReview(request);
    const clientDocument = createImportedReviewDocument({
      userId: "forged-user",
      review,
      category: "logo",
    });

    const result = await syncReviewDocumentsForUser("verified-user", [clientDocument]);
    const savedPayload = firestoreMock.set.mock.calls[0]?.[0] as {
      id: string;
      origin: string;
      provenance?: unknown;
      status: string;
      userId: string;
    };

    expect(result.failedIds).toEqual([]);
    expect(result.savedIds).toEqual([savedPayload.id]);
    expect(firestoreMock.collection).toHaveBeenCalledWith("reviewDrafts");
    expect(firestoreMock.collection).not.toHaveBeenCalledWith("reviews");
    expect(savedPayload.userId).toBe("verified-user");
    expect(savedPayload.id).not.toContain("forged-user");
    expect(savedPayload.origin).toBe("imported");
    expect(savedPayload.status).toBe("imported");
    expect(savedPayload.provenance).toBeUndefined();
  });

  it("stores the uploaded source image privately with the review document", async () => {
    const review = createDemoReview(request);

    const document = await saveReviewForUser({
      userId: "verified-user",
      review,
      category: "logo",
      sourceImage: {
        file: request.file,
        image: { mimeType: "image/png", dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB" },
      },
    });

    expect(storageMock.file).toHaveBeenCalledWith(`users/verified-user/reviews/${document.id}/source.png`);
    expect(storageMock.save).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({
      resumable: false,
      metadata: expect.objectContaining({
        cacheControl: "private, max-age=300",
        contentType: "image/png",
      }),
    }));
    expect(firestoreMock.set).toHaveBeenCalledWith(expect.objectContaining({
      sourceImage: expect.objectContaining({
        contentType: "image/png",
        originalName: "mark.png",
        storagePath: `users/verified-user/reviews/${document.id}/source.png`,
      }),
    }), { merge: true });
  });

  it("writes review text without contacting Storage in free mode", async () => {
    vi.stubEnv("IROGUIDE_LAUNCH_PROFILE", "free");
    const review = createDemoReview(request);

    const document = await saveReviewForUser({
      userId: "verified-user",
      review,
      category: "logo",
      sourceImage: {
        file: request.file,
        image: { mimeType: "image/png", dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB" },
      },
    });

    expect(document).not.toHaveProperty("sourceImage");
    expect(storageMock.file).not.toHaveBeenCalled();
    expect(storageMock.save).not.toHaveBeenCalled();
    expect(firestoreMock.set).toHaveBeenCalledWith(expect.not.objectContaining({
      sourceImage: expect.anything(),
    }), { merge: true });
  });

  it("deletes historical Storage data even after switching to free mode", async () => {
    vi.stubEnv("IROGUIDE_LAUNCH_PROFILE", "free");

    const result = await deleteReviewDataForUser("verified-user");

    expect(storageMock.getFiles).toHaveBeenCalledWith({
      maxResults: 100,
      prefix: "users/verified-user/reviews/",
    });
    expect(result.sourceImagesDeleted).toBe(0);
  });

  it("deletes stored reviews and drafts for the verified user", async () => {
    const reviewDocs = [{ ref: { path: "reviews/one" } }, { ref: { path: "reviews/two" } }];
    const draftDocs = [{ ref: { path: "reviewDrafts/active" } }];
    const imageFiles = [{ delete: storageMock.fileDelete }, { delete: storageMock.fileDelete }];
    firestoreMock.get
      .mockResolvedValueOnce({ docs: reviewDocs, empty: false })
      .mockResolvedValueOnce({ docs: draftDocs, empty: false });
    storageMock.getFiles.mockResolvedValueOnce([imageFiles]);

    const result = await deleteReviewDataForUser("verified-user");

    expect(firestoreMock.collection).toHaveBeenCalledWith("reviews");
    expect(firestoreMock.collection).toHaveBeenCalledWith("reviewDrafts");
    expect(firestoreMock.where).toHaveBeenCalledWith("userId", "==", "verified-user");
    expect(firestoreMock.batchDelete).toHaveBeenCalledTimes(3);
    expect(firestoreMock.commit).toHaveBeenCalledTimes(2);
    expect(storageMock.getFiles).toHaveBeenCalledWith({ maxResults: 100, prefix: "users/verified-user/reviews/" });
    expect(storageMock.fileDelete).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      draftsDeleted: 1,
      failures: [],
      feedbackDeleted: 0,
      pipelineDocumentsDeleted: 0,
      reviewsDeleted: 2,
      sourceImagesDeleted: 2,
      stagingImagesDeleted: 0,
      status: "complete",
    });
  });

  it("returns retryable state and keeps other cleanup attempts visible after a partial failure", async () => {
    vi.stubEnv("IROGUIDE_LAUNCH_PROFILE", "free");
    storageMock.getFiles.mockRejectedValueOnce(new Error("storage unavailable"));

    const deletion = deleteReviewDataForUser("verified-user");

    await expect(deletion).rejects.toBeInstanceOf(ReviewDeletionIncompleteError);
    await expect(deletion).rejects.toMatchObject({
      result: {
        draftsDeleted: 0,
        feedbackDeleted: 0,
        reviewsDeleted: 0,
        sourceImagesDeleted: 0,
        status: "retry-required",
        retryToken: expect.any(String),
        failures: [{ operation: "source-images", reason: "error" }],
      },
    });
    expect(firestoreMock.collection).toHaveBeenCalledWith("reviews");
    expect(firestoreMock.collection).toHaveBeenCalledWith("reviewDrafts");
    expect(firestoreMock.collection).toHaveBeenCalledWith("reviewFeedback");
  });
});
