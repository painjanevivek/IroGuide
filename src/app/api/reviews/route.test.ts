import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/firebase-admin", () => ({
  FirebaseAdminUnavailableError: class FirebaseAdminUnavailableError extends Error {},
  FirebaseTokenVerificationError: class FirebaseTokenVerificationError extends Error {},
  verifyFirebaseIdToken: vi.fn(),
}));

vi.mock("@/server/review-provider", () => ({
  ReviewProviderUnavailableError: class ReviewProviderUnavailableError extends Error {},
  createReview: vi.fn(),
}));

vi.mock("@/server/review-storage", () => ({
  saveReviewForUser: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({
    allowed: true,
    limit: 12,
    remaining: 11,
    resetAt: Date.now() + 60_000,
    retryAfterSeconds: 60,
  })),
  getRateLimitHeaders: vi.fn(() => ({})),
  getRateLimitIdentity: vi.fn(({ scope, userId }: { scope: string; userId?: string }) => (
    userId ? `${scope}:user:${userId}` : `${scope}:client:shared`
  )),
}));

import { verifyFirebaseIdToken } from "@/server/firebase-admin";
import { createReview } from "@/server/review-provider";
import { saveReviewForUser } from "@/server/review-storage";
import { POST } from "./route";

const reviewRequest = {
  category: "logo",
  mode: "mentor",
  file: { name: "logo.png", type: "image/png", size: 120_000 },
  brief: {
    audience: "Teen designers",
    purpose: "Build trust for a portfolio site",
    style: "Bold and minimal",
    goal: "Improve the logo hierarchy",
    concern: "The mark feels too plain.",
  },
};

const review = {
  id: "review-1",
  createdAt: "2026-08-11T00:00:00.000Z",
  overallScore: 8,
  summary: "Clear direction.",
  strengths: ["Recognizable silhouette."],
  scores: [{ label: "Clarity", score: 8 }],
  rubricVersion: "test-v1",
  issues: [{
    id: "issue-1",
    category: "Clarity",
    score: 8,
    priority: "medium" as const,
    observation: "Spacing is uneven.",
    impact: "The mark feels less deliberate.",
    recommendation: "Normalize spacing.",
    actions: ["Use one spacing unit."],
  }],
  annotations: [],
  checklist: [{ label: "Normalize spacing.", priority: "medium" as const }],
  followUps: [],
  provider: "live" as const,
};

describe("review generation authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createReview).mockResolvedValue(review);
    vi.mocked(saveReviewForUser).mockResolvedValue({
      id: "document-1",
      userId: "approved-account",
      category: "logo",
      categoryLabel: "Logo",
      review,
      provider: "live",
      status: "complete",
      savedAt: review.createdAt,
      updatedAt: review.createdAt,
      syncState: "cloud",
    });
  });

  it("stops an unverified self-created account before provider use", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "new-account",
      sub: "new-account",
      iat: 1,
      email_verified: false,
      iroguide_review_entitled: true,
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(403);
    expect(createReview).not.toHaveBeenCalled();
  });

  it("stops a verified but unentitled account before provider use", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "verified-but-unapproved",
      sub: "verified-but-unapproved",
      iat: 1,
      email_verified: true,
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(403);
    expect(createReview).not.toHaveBeenCalled();
  });

  it("preserves provider use for verified entitled accounts", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "approved-account",
      sub: "approved-account",
      iat: 1,
      email_verified: true,
      iroguide_review_entitled: true,
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(createReview).toHaveBeenCalledOnce();
  });
});

function createRequest() {
  return new Request("https://iroguide.com/api/reviews", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
      Origin: "https://iroguide.com",
    },
    body: JSON.stringify(reviewRequest),
  });
}
