import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoReview } from "@/domain/demo-review";
import { createStoredReviewDocument } from "@/domain/review-storage";
import type { ReviewRequest } from "@/domain/review";
import { saveReviewForUser, syncReviewDocumentsForUser } from "./review-storage";

const firestoreMock = vi.hoisted(() => {
  const set = vi.fn();
  const doc = vi.fn(() => ({ set }));
  const collection = vi.fn(() => ({ doc }));

  return { collection, doc, set };
});

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminFirestore: () => ({
    collection: firestoreMock.collection,
  }),
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
    firestoreMock.collection.mockClear();
    firestoreMock.doc.mockClear();
    firestoreMock.set.mockClear();
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
    }), { merge: true });
  });

  it("normalizes pending sync documents to the verified user", async () => {
    const review = createDemoReview(request);
    const clientDocument = createStoredReviewDocument({
      userId: "forged-user",
      review,
      category: "logo",
      syncState: "local",
    });

    const result = await syncReviewDocumentsForUser("verified-user", [clientDocument]);
    const savedPayload = firestoreMock.set.mock.calls[0]?.[0] as { userId: string; id: string };

    expect(result.failedIds).toEqual([]);
    expect(result.savedIds).toEqual([savedPayload.id]);
    expect(savedPayload.userId).toBe("verified-user");
    expect(savedPayload.id).not.toContain("forged-user");
  });
});
