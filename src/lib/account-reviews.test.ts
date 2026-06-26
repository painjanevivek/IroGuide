import { describe, expect, it } from "vitest";
import { createDemoReview } from "@/domain/demo-review";
import type { ReviewRequest } from "@/domain/review";
import { createStoredReviewDocument } from "@/lib/review-persistence";
import { mergeAccountReviews, toAccountStoredReview } from "./account-reviews";

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

describe("account reviews", () => {
  it("normalizes persisted review documents for shared account-backed views", () => {
    const review = { ...createDemoReview(request), createdAt: "2026-06-24T00:00:00.000Z" };
    const document = createStoredReviewDocument({
      category: "logo",
      review,
      sourceImage: {
        storagePath: "users/user-a/reviews/review-id/source.png",
        contentType: "image/png",
        size: 1024,
        originalName: "mark.png",
        uploadedAt: "2026-06-24T00:00:00.000Z",
      },
      syncState: "cloud",
      userId: "user-a",
    });

    expect(toAccountStoredReview(document.id, document)).toMatchObject({
      category: "Logo",
      documentId: document.id,
      id: review.id,
      overallScore: review.overallScore,
      sourceImage: document.sourceImage,
      syncState: "cloud",
    });
  });

  it("merges cached and cloud reviews with cloud data winning duplicate ids", () => {
    const olderReview = { ...createDemoReview(request), id: "older", createdAt: "2026-06-23T00:00:00.000Z" };
    const cachedReview = { ...createDemoReview(request), id: "shared", createdAt: "2026-06-24T00:00:00.000Z", overallScore: 6 };
    const cloudReview = { ...cachedReview, overallScore: 8 };
    const older = toAccountStoredReview("older-doc", createStoredReviewDocument({ category: "logo", review: olderReview, userId: "user-a" }));
    const cached = toAccountStoredReview("shared-doc", createStoredReviewDocument({ category: "logo", review: cachedReview, userId: "user-a" }));
    const cloud = toAccountStoredReview("shared-doc", createStoredReviewDocument({ category: "logo", review: cloudReview, syncState: "cloud", userId: "user-a" }));

    expect(older).not.toBeNull();
    expect(cached).not.toBeNull();
    expect(cloud).not.toBeNull();

    const merged = mergeAccountReviews([cloud!], [older!, cached!]);

    expect(merged.map((review) => review.id)).toEqual(["shared", "older"]);
    expect(merged[0]?.overallScore).toBe(8);
  });
});
