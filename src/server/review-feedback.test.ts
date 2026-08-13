import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  serverTimestamp: vi.fn(() => "server-timestamp"),
  fromDate: vi.fn((date: Date) => ({ seconds: Math.floor(date.getTime() / 1000) })),
  getFirebaseAdminFirestore: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: mocks.serverTimestamp },
  Timestamp: { fromDate: mocks.fromDate },
}));

vi.mock("./firebase-admin", () => ({ getFirebaseAdminFirestore: mocks.getFirebaseAdminFirestore }));

import { ReviewFeedbackAuthorizationError, saveReviewFindingFeedback } from "./review-feedback";

describe("review feedback storage", () => {
  const reviewGet = vi.fn();
  const feedbackSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFirebaseAdminFirestore.mockResolvedValue({
      collection: vi.fn((name: string) => name === "reviews"
        ? { doc: vi.fn(() => ({ get: reviewGet })) }
        : { doc: vi.fn(() => ({ set: feedbackSet })) }),
    });
    reviewGet.mockResolvedValue({ data: () => trustedReview("owner") });
    feedbackSet.mockResolvedValue(undefined);
  });

  it("stores bounded feedback only after verifying trusted server provenance and ownership", async () => {
    const saved = await saveReviewFindingFeedback("owner", {
      reviewDocumentId: "review-document",
      issueId: "issue-1",
      verdict: "not-helpful",
      reason: "inaccurate",
    });

    expect(saved.id).toContain("owner");
    expect(feedbackSet).toHaveBeenCalledWith(expect.objectContaining({
      userId: "owner",
      reviewId: "review-1",
      rubricId: "UI-TASK-CLARITY-001",
      verdict: "not-helpful",
      reason: "inaccurate",
    }), { merge: true });
    expect(mocks.serverTimestamp).toHaveBeenCalledTimes(2);
    expect(mocks.fromDate).toHaveBeenCalledOnce();
  });

  it("rejects ratings for reviews that are not owned and server-generated", async () => {
    reviewGet.mockResolvedValue({ data: () => trustedReview("another-user") });

    await expect(saveReviewFindingFeedback("owner", {
      reviewDocumentId: "review-document",
      issueId: "issue-1",
      verdict: "helpful",
    })).rejects.toBeInstanceOf(ReviewFeedbackAuthorizationError);
    expect(feedbackSet).not.toHaveBeenCalled();
  });
});

function trustedReview(userId: string) {
  return {
    userId,
    status: "complete",
    provenance: { origin: "server", schemaVersion: 1 },
    review: {
      id: "review-1",
      issues: [{ id: "issue-1", rubricId: "UI-TASK-CLARITY-001" }],
    },
  };
}
