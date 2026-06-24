import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoReview } from "@/domain/demo-review";
import type { ReviewRequest } from "@/domain/review";
import { cacheReviewDocument, createStoredReviewDocument, getCachedReviewDocuments } from "./review-persistence";
import { syncPendingAccountReviews, syncReviewDocumentsToAccount } from "./review-sync";

const postJsonWithFallbackMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  postJsonWithFallback: postJsonWithFallbackMock,
}));

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

describe("review sync", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    postJsonWithFallbackMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("syncs pending local reviews and marks cached documents as cloud-backed", async () => {
    const review = createDemoReview(request);
    const document = createStoredReviewDocument({ userId: "user-a", review, category: "logo" });
    cacheReviewDocument(document, storage);
    postJsonWithFallbackMock.mockResolvedValue({
      failedIds: [],
      savedIds: [document.id],
      sourceImages: [],
    });

    const result = await syncPendingAccountReviews({
      getIdToken: async () => "token",
      userId: "user-a",
    });

    expect(result).toEqual({ attempted: true, failedCount: 0, pendingCount: 1, syncedCount: 1 });
    expect(postJsonWithFallbackMock).toHaveBeenCalledWith(expect.objectContaining({
      path: "/api/reviews/sync",
      init: expect.objectContaining({
        body: JSON.stringify({ documents: [document] }),
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
        method: "POST",
      }),
    }));
    expect(getCachedReviewDocuments("user-a", storage)[0]).toEqual(expect.objectContaining({
      id: document.id,
      syncState: "cloud",
    }));
  });

  it("skips the network when there are no local reviews waiting for sync", async () => {
    await expect(syncPendingAccountReviews({
      getIdToken: async () => "token",
      userId: "user-a",
    })).resolves.toEqual({ attempted: false, failedCount: 0, pendingCount: 0, syncedCount: 0 });

    expect(postJsonWithFallbackMock).not.toHaveBeenCalled();
  });

  it("preserves synced source image metadata returned by account storage", async () => {
    const review = createDemoReview(request);
    const document = createStoredReviewDocument({ userId: "user-a", review, category: "logo" });
    cacheReviewDocument(document, storage);
    const sourceImage = {
      contentType: "image/png" as const,
      originalName: "mark.png",
      size: 1024,
      storagePath: "users/user-a/reviews/source.png",
      uploadedAt: "2026-06-24T00:00:00.000Z",
    };
    postJsonWithFallbackMock.mockResolvedValue({
      failedIds: [],
      savedIds: [document.id],
      sourceImages: [{ id: document.id, sourceImage }],
    });

    await syncReviewDocumentsToAccount("token", [document]);

    expect(getCachedReviewDocuments("user-a", storage)[0]?.sourceImage).toEqual(sourceImage);
  });
});
