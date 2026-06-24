import { describe, expect, it } from "vitest";
import { createDemoReview } from "@/domain/demo-review";
import type { ReviewRequest } from "@/domain/review";
import {
  cacheReviewDocument,
  clearCachedReviewDocuments,
  createStoredReviewDocument,
  getCachedReviewDocuments,
  getPendingLocalReviewDocuments,
  getReviewDocumentId,
} from "./review-persistence";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

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

describe("review persistence", () => {
  it("creates a stable safe dashboard document", () => {
    const review = createDemoReview(request);
    const document = createStoredReviewDocument({
      userId: "user/id@example.com",
      review: { ...review, id: "review/id with spaces" },
      category: "logo",
      savedAt: "2026-06-23T00:00:00.000Z",
    });

    expect(document.id).toBe(getReviewDocumentId("user/id@example.com", "review/id with spaces"));
    expect(document.id).not.toContain("/");
    expect(document.categoryLabel).toBe("Logo");
    expect(document.status).toBe("complete");
    expect(document.syncState).toBe("local");
  });

  it("caches completed reviews per signed-in user", () => {
    const storage = new MemoryStorage();
    const firstReview = { ...createDemoReview(request), createdAt: "2026-06-23T00:00:00.000Z" };
    const secondReview = { ...firstReview, id: "second", createdAt: "2026-06-24T00:00:00.000Z" };
    const firstDocument = createStoredReviewDocument({ userId: "user-a", review: firstReview, category: "logo" });
    const secondDocument = createStoredReviewDocument({ userId: "user-a", review: secondReview, category: "poster" });
    const otherUserDocument = createStoredReviewDocument({ userId: "user-b", review: firstReview, category: "logo" });

    expect(cacheReviewDocument(firstDocument, storage)).toBe(true);
    expect(cacheReviewDocument(secondDocument, storage)).toBe(true);
    expect(cacheReviewDocument(otherUserDocument, storage)).toBe(true);

    expect(getCachedReviewDocuments("user-a", storage).map((document) => document.id)).toEqual([
      secondDocument.id,
      firstDocument.id,
    ]);
    expect(getCachedReviewDocuments("user-b", storage).map((document) => document.id)).toEqual([
      otherUserDocument.id,
    ]);
  });

  it("keeps private source image metadata without caching image bytes", () => {
    const storage = new MemoryStorage();
    const review = createDemoReview(request);
    const document = createStoredReviewDocument({
      userId: "user-a",
      review,
      category: "logo",
      sourceImage: {
        storagePath: "users/user-a/reviews/review-id/source.png",
        contentType: "image/png",
        size: 1024,
        originalName: "mark.png",
        uploadedAt: "2026-06-23T00:00:00.000Z",
      },
    });

    cacheReviewDocument(document, storage);

    expect(getCachedReviewDocuments("user-a", storage)[0]?.sourceImage).toEqual(document.sourceImage);
  });

  it("ignores corrupted cached values", () => {
    const storage = new MemoryStorage();
    storage.setItem("iroguide:dashboard-reviews:v1:user-a", "not-json");

    expect(getCachedReviewDocuments("user-a", storage)).toEqual([]);
  });

  it("returns only locally pending documents for account sync", () => {
    const storage = new MemoryStorage();
    const review = createDemoReview(request);
    const pendingDocument = createStoredReviewDocument({ userId: "user-a", review, category: "logo" });
    const syncedDocument = createStoredReviewDocument({
      userId: "user-a",
      review: { ...review, id: "synced" },
      category: "logo",
      syncState: "cloud",
    });

    cacheReviewDocument(pendingDocument, storage);
    cacheReviewDocument(syncedDocument, storage);

    expect(getPendingLocalReviewDocuments("user-a", storage).map((document) => document.id)).toEqual([
      pendingDocument.id,
    ]);
  });

  it("clears cached reviews for a signed-in user", () => {
    const storage = new MemoryStorage();
    const review = createDemoReview(request);
    const document = createStoredReviewDocument({ userId: "user-a", review, category: "logo" });

    cacheReviewDocument(document, storage);

    expect(clearCachedReviewDocuments("user-a", storage)).toBe(true);
    expect(getCachedReviewDocuments("user-a", storage)).toEqual([]);
  });
});
