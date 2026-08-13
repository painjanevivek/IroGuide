import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/api-security", () => ({
  enforceRateLimit: vi.fn(() => ({ result: { allowed: true, remaining: 19, resetAt: Date.now() + 60_000 } })),
  enforceSameOriginRequest: vi.fn(() => ({ allowed: true })),
  requireContentType: vi.fn(() => ({ allowed: true })),
  requireVerifiedFirebaseUser: vi.fn(),
}));

vi.mock("@/server/review-feedback", () => ({
  ReviewFeedbackAuthorizationError: class ReviewFeedbackAuthorizationError extends Error {},
  saveReviewFindingFeedback: vi.fn(),
}));

vi.mock("@/server/observability", () => ({
  createRequestContext: vi.fn(() => ({ requestId: "request-1" })),
  jsonHeaders: vi.fn(() => ({ "x-request-id": "request-1" })),
  logRequestEvent: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  getRateLimitHeaders: vi.fn(() => ({})),
}));

import { requireVerifiedFirebaseUser } from "@/server/api-security";
import { saveReviewFindingFeedback } from "@/server/review-feedback";
import { POST } from "./route";

describe("review finding feedback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireVerifiedFirebaseUser).mockResolvedValue({
      user: { uid: "owner", sub: "owner", iat: 1 },
      userLogId: "owner",
    });
    vi.mocked(saveReviewFindingFeedback).mockResolvedValue({ id: "feedback-1" });
  });

  it("stores only a bounded rating for the authenticated review owner", async () => {
    const response = await POST(request({
      reviewDocumentId: "owner_review-1",
      issueId: "issue-1",
      verdict: "not-helpful",
      reason: "inaccurate",
    }));

    expect(response.status).toBe(200);
    expect(saveReviewFindingFeedback).toHaveBeenCalledWith("owner", expect.objectContaining({ issueId: "issue-1" }));
  });

  it("rejects invalid feedback before it reaches storage", async () => {
    const response = await POST(request({
      reviewDocumentId: "owner_review-1",
      issueId: "issue-1",
      verdict: "invalid",
    }));

    expect(response.status).toBe(400);
    expect(saveReviewFindingFeedback).not.toHaveBeenCalled();
  });
});

function request(body: unknown) {
  return new Request("https://iroguide.com/api/reviews/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token", Origin: "https://iroguide.com" },
    body: JSON.stringify(body),
  });
}
