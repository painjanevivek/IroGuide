import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { FirebaseTokenVerificationError, verifyFirebaseIdToken } from "@/server/firebase-admin";
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
    vi.stubEnv("IROGUIDE_CAPABILITY_LIVE_CRITIQUE", "true");
    vi.mocked(createReview).mockResolvedValue(review);
    vi.mocked(saveReviewForUser).mockResolvedValue({
      id: "document-1",
      userId: "approved-account",
      category: "logo",
      categoryLabel: "Logo",
      projectId: null,
      review,
      provider: "live",
      status: "complete",
      savedAt: review.createdAt,
      updatedAt: review.createdAt,
      syncState: "cloud",
      provenance: {
        origin: "server",
        schemaVersion: 1,
        generatedAt: review.createdAt,
      },
    });
  });

  it("stops an unverified self-created account before provider use", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "new-account",
      sub: "new-account",
      auth_time: 1,
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
      auth_time: 1,
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
      auth_time: 1,
      iat: 1,
      email_verified: true,
      iroguide_review_entitled: true,
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(createReview).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({
      persistence: {
        documentId: "document-1",
        savedToAccount: true,
      },
    });
  });

  it("stops a free-launch request before provider use even for an entitled account", async () => {
    vi.stubEnv("IROGUIDE_LAUNCH_PROFILE", "free");
    vi.stubEnv("IROGUIDE_CAPABILITY_LIVE_CRITIQUE", "false");
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "approved-account",
      sub: "approved-account",
      auth_time: 1,
      iat: 1,
      email_verified: true,
      iroguide_review_entitled: true,
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Live critique is unavailable. Continue with the free guided practice instead.",
    });
    expect(createReview).not.toHaveBeenCalled();
    expect(saveReviewForUser).not.toHaveBeenCalled();
    expect(verifyFirebaseIdToken).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});

describe("review authentication abuse controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("IROGUIDE_CAPABILITY_LIVE_CRITIQUE", "true");
    vi.mocked(verifyFirebaseIdToken).mockRejectedValue(new FirebaseTokenVerificationError());
  });

  afterEach(() => vi.unstubAllEnvs());

  it("throttles repeated forged tokens before further verification work", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const clientKey = `198.51.100.${Date.now()}`;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await POST(createRequest(clientKey));
      expect(response.status).toBe(401);
    }

    const blocked = await POST(createRequest(clientKey));

    expect(blocked.status).toBe(429);
    expect(verifyFirebaseIdToken).toHaveBeenCalledTimes(30);
    warn.mockRestore();
  });
});

function createRequest(clientKey?: string) {
  return new Request("https://iroguide.com/api/reviews", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
      Origin: "https://iroguide.com",
      ...(clientKey ? { "x-forwarded-for": clientKey } : {}),
    },
    body: JSON.stringify(reviewRequest),
  });
}
