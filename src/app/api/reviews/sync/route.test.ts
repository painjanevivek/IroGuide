import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoReview } from "@/domain/demo-review";
import type { ReviewRequest } from "@/domain/review";
import { createImportedReviewDocument } from "@/domain/review-storage";

vi.mock("@/server/firebase-admin", () => ({
  FirebaseAdminUnavailableError: class FirebaseAdminUnavailableError extends Error {},
  FirebaseTokenVerificationError: class FirebaseTokenVerificationError extends Error {},
  verifyFirebaseIdToken: vi.fn(),
}));

vi.mock("@/server/review-storage", () => ({
  syncReviewDocumentsForUser: vi.fn(),
}));

import { verifyFirebaseIdToken } from "@/server/firebase-admin";
import { syncReviewDocumentsForUser } from "@/server/review-storage";
import { POST } from "./route";

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

describe("review sync provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({ uid: "user-a", sub: "user-a", auth_time: 1, iat: 1 });
    vi.mocked(syncReviewDocumentsForUser).mockResolvedValue({
      failedIds: [],
      savedIds: ["user-a_imported"],
      sourceImages: [],
    });
  });

  it("rejects a forged completed live review before storage", async () => {
    const review = { ...createDemoReview(request), provider: "live" as const };
    const response = await POST(createSyncRequest({
      documents: [{
        id: "forged",
        userId: "user-a",
        origin: "server",
        status: "complete",
        category: "logo",
        categoryLabel: "Logo",
        provider: "live",
        review,
        savedAt: "2026-08-11T09:30:00.000Z",
        updatedAt: "2026-08-11T09:30:00.000Z",
        syncState: "local",
        provenance: {
          origin: "server",
          schemaVersion: 1,
          generatedAt: "2026-08-11T09:30:00.000Z",
        },
      }],
    }));

    expect(response.status).toBe(400);
    expect(syncReviewDocumentsForUser).not.toHaveBeenCalled();
  });

  it("accepts a bounded imported review", async () => {
    const imported = createImportedReviewDocument({
      category: "logo",
      review: createDemoReview(request),
      savedAt: "2026-08-11T09:30:00.000Z",
      userId: "user-a",
    });

    const response = await POST(createSyncRequest({ documents: [imported] }));

    expect(response.status).toBe(200);
    expect(syncReviewDocumentsForUser).toHaveBeenCalledWith("user-a", [imported]);
  });
});

function createSyncRequest(body: unknown) {
  return new Request("https://iroguide.com/api/reviews/sync", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
      Origin: "https://iroguide.com",
    },
    body: JSON.stringify(body),
  });
}
