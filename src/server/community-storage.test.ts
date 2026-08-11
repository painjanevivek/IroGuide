import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { createDemoReview } from "@/domain/demo-review";
import type { ReviewRequest } from "@/domain/review";
import { createStoredReviewDocument } from "@/domain/review-storage";
import { createTrustedReviewDocument } from "./review-provenance";
import { CommunityMutationError, mutateCommunity } from "./community-storage";

const firestoreMock = vi.hoisted(() => {
  const reviewGet = vi.fn();
  const postSet = vi.fn();
  const reviewDoc = vi.fn(() => ({ get: reviewGet }));
  const postDoc = vi.fn(() => ({ id: "post-1", set: postSet }));
  const collection = vi.fn((name: string) => ({ doc: name === "reviews" ? reviewDoc : postDoc }));

  return { collection, postSet, reviewGet };
});

vi.mock("@/server/firebase-admin", () => ({
  getFirebaseAdminFirestore: () => ({ collection: firestoreMock.collection }),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "server-timestamp" },
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

describe("community review publication", () => {
  beforeEach(() => {
    firestoreMock.collection.mockClear();
    firestoreMock.postSet.mockClear();
    firestoreMock.reviewGet.mockReset();
  });

  it.each([
    ["missing", { exists: false }],
    ["non-owned", {
      exists: true,
      data: () => createTrustedReviewDocument({
        category: "logo",
        review: createDemoReview(request),
        userId: "user-b",
      }),
    }],
  ])("returns 404 for a %s review without exposing ownership", async (_name, snapshot) => {
    firestoreMock.reviewGet.mockResolvedValue(snapshot);

    await expect(mutateCommunity(
      { uid: "user-a" },
      { action: "publish", reviewId: "review-1" },
    )).rejects.toEqual(expect.objectContaining<Partial<CommunityMutationError>>({ status: 404 }));
    expect(firestoreMock.postSet).not.toHaveBeenCalled();
  });

  it("returns 409 for an owned legacy review without server provenance", async () => {
    firestoreMock.reviewGet.mockResolvedValue({
      exists: true,
      data: () => createStoredReviewDocument({
        category: "logo",
        review: createDemoReview(request),
        userId: "user-a",
      }),
    });

    await expect(mutateCommunity(
      { uid: "user-a" },
      { action: "publish", reviewId: "review-1" },
    )).rejects.toEqual(expect.objectContaining<Partial<CommunityMutationError>>({ status: 409 }));
    expect(firestoreMock.postSet).not.toHaveBeenCalled();
  });

  it("publishes only an owned server-attested review loaded from storage", async () => {
    const document = createTrustedReviewDocument({
      category: "logo",
      review: createDemoReview(request),
      userId: "user-a",
    });
    firestoreMock.reviewGet.mockResolvedValue({ exists: true, data: () => document });

    await expect(mutateCommunity(
      { uid: "user-a", name: "Designer" },
      { action: "publish", reviewId: "review-1" },
    )).resolves.toEqual({ id: "post-1" });
    expect(firestoreMock.postSet).toHaveBeenCalledWith(expect.objectContaining({
      authorId: "user-a",
      review: document.review,
      reviewId: "review-1",
    }));
  });

  it("rejects client-supplied review content before reading storage", async () => {
    await expect(mutateCommunity(
      { uid: "user-a" },
      { action: "publish", reviewId: "review-1", review: createDemoReview(request) },
    )).rejects.toBeInstanceOf(ZodError);
    expect(firestoreMock.reviewGet).not.toHaveBeenCalled();
  });
});
