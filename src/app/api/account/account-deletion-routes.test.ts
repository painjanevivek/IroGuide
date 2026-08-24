import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteCommunityDataForUser: vi.fn(),
  deleteFirebaseUser: vi.fn(),
  deleteReviewDataForUser: vi.fn(),
  logRequestEvent: vi.fn(),
  verifyRecentFirebaseIdToken: vi.fn(),
}));

vi.mock("@/server/api-security", () => ({
  enforceSameOriginRequest: () => ({}),
  requireTrustedClientKey: () => ({ key: "trusted-client" }),
}));

vi.mock("@/server/community-storage", () => ({
  deleteCommunityDataForUser: mocks.deleteCommunityDataForUser,
}));

vi.mock("@/server/firebase-admin", () => ({
  deleteFirebaseUser: mocks.deleteFirebaseUser,
  FirebaseAdminUnavailableError: class FirebaseAdminUnavailableError extends Error {},
  FirebaseTokenVerificationError: class FirebaseTokenVerificationError extends Error {
    code?: string;
  },
  verifyRecentFirebaseIdToken: mocks.verifyRecentFirebaseIdToken,
}));

vi.mock("@/server/observability", () => ({
  createRequestContext: () => ({ requestId: "request-1", route: "account-delete", startedAt: Date.now() }),
  jsonHeaders: () => ({ "x-request-id": "request-1" }),
  logRequestEvent: mocks.logRequestEvent,
  toLogSafeUserId: () => "safe-user",
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimit: () => Promise.resolve({ allowed: true, limit: 4, remaining: 3, resetAt: Date.now() + 60_000, retryAfterSeconds: 60 }),
  getRateLimitHeaders: () => ({}),
}));

vi.mock("@/server/review-storage", () => ({
  deleteReviewDataForUser: mocks.deleteReviewDataForUser,
  ReviewDeletionIncompleteError: class ReviewDeletionIncompleteError extends Error {
    constructor(readonly result: unknown) {
      super("Review cleanup is incomplete.");
    }
  },
}));

import { DELETE as deleteAccount } from "./route";
import { DELETE as deleteReviews } from "./reviews/route";
import { ReviewDeletionIncompleteError } from "@/server/review-storage";
import type { ReviewDeleteResult } from "@/server/review-storage";

const completeDeletion = {
  draftsDeleted: 1,
  failures: [],
  feedbackDeleted: 2,
  pipelineDocumentsDeleted: 0,
  reviewsDeleted: 3,
  sourceImagesDeleted: 4,
  stagingImagesDeleted: 0,
  status: "complete" as const,
};

describe("account deletion routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyRecentFirebaseIdToken.mockResolvedValue({ uid: "owner", sub: "owner", iat: 1 });
    mocks.deleteReviewDataForUser.mockResolvedValue(completeDeletion);
    mocks.deleteCommunityDataForUser.mockResolvedValue({ commentsDeleted: 0, interactionsDeleted: 0, postsDeleted: 0 });
    mocks.deleteFirebaseUser.mockResolvedValue(undefined);
  });

  it("deletes all owned data before deleting the Firebase identity", async () => {
    const response = await deleteAccount(request("/api/account"));

    expect(response.status).toBe(200);
    expect(mocks.deleteReviewDataForUser).toHaveBeenCalledWith("owner");
    expect(mocks.deleteCommunityDataForUser).toHaveBeenCalledWith("owner");
    expect(mocks.deleteFirebaseUser).toHaveBeenCalledWith("owner");
    expect(mocks.deleteFirebaseUser.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.deleteReviewDataForUser.mock.invocationCallOrder[0]!,
    );
    await expect(response.json()).resolves.toMatchObject({ deleted: true, status: "complete" });
  });

  it("keeps the identity recoverable when review cleanup needs a retry", async () => {
    const retryResult = {
      ...completeDeletion,
      failures: [{ operation: "source-images", reason: "error" }],
      retryToken: "retry-token",
      status: "retry-required" as const,
    } satisfies ReviewDeleteResult;
    mocks.deleteReviewDataForUser.mockRejectedValue(new ReviewDeletionIncompleteError(retryResult));

    const response = await deleteAccount(request("/api/account"));

    expect(response.status).toBe(503);
    expect(mocks.deleteFirebaseUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ deleted: false, retryToken: "retry-token", status: "retry-required" });
  });

  it("surfaces retry state when review-history cleanup is partial", async () => {
    const retryResult = {
      ...completeDeletion,
      failures: [{ operation: "drafts", reason: "error" }],
      retryToken: "review-retry-token",
      status: "retry-required" as const,
    } satisfies ReviewDeleteResult;
    mocks.deleteReviewDataForUser.mockRejectedValue(new ReviewDeletionIncompleteError(retryResult));

    const response = await deleteReviews(request("/api/account/reviews"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ deleted: false, retryToken: "review-retry-token", status: "retry-required" });
  });
});

function request(path: string) {
  return new Request(`https://iroguide.com${path}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer recent-token",
      Origin: "https://iroguide.com",
    },
  });
}
