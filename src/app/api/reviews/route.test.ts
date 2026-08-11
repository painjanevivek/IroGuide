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

import { verifyFirebaseIdToken } from "@/server/firebase-admin";
import { createReview } from "@/server/review-provider";
import { saveReviewForUser } from "@/server/review-storage";
import { POST } from "./route";

const MAX_REQUEST_BODY_SIZE = 15 * 1024 * 1024;

const reviewRequest = {
  category: "logo",
  mode: "mentor",
  file: { name: "logo.png", type: "image/png", size: 120_000 },
  brief: {
    audience: "Teen designers",
    purpose: "Build trust for a portfolio site",
    style: "Bold and minimal",
    goal: "Improve the logo hierarchy",
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
  provider: "demo" as const,
};

describe("review request body limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({ uid: "user-1", sub: "user-1", iat: 1 });
    vi.mocked(createReview).mockResolvedValue(review);
    vi.mocked(saveReviewForUser).mockResolvedValue({
      id: "document-1",
      userId: "user-1",
      category: "logo",
      categoryLabel: "Logo",
      review,
      provider: "demo",
      status: "complete",
      savedAt: review.createdAt,
      updatedAt: review.createdAt,
      syncState: "cloud",
    });
  });

  it("rejects an oversized declared body before provider use", async () => {
    const request = createRequest("{}", {
      "Content-Length": String(MAX_REQUEST_BODY_SIZE + 1),
    });

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Request body is too large." });
    expect(request.bodyUsed).toBe(false);
    expect(createReview).not.toHaveBeenCalled();
    expect(saveReviewForUser).not.toHaveBeenCalled();
  });

  it("preserves legitimate review creation", async () => {
    const response = await POST(createRequest(JSON.stringify(reviewRequest)));

    expect(response.status).toBe(200);
    expect(createReview).toHaveBeenCalledOnce();
    expect(saveReviewForUser).toHaveBeenCalledOnce();
  });
});

function createRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://iroguide.com/api/reviews", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
      Origin: "https://iroguide.com",
      ...headers,
    },
    body,
  });
}
