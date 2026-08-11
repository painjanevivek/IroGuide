import { beforeEach, describe, expect, it, vi } from "vitest";

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

const MAX_REQUEST_BODY_SIZE = 15 * 1024 * 1024;

describe("review sync request body limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({ uid: "user-1", sub: "user-1", iat: 1 });
    vi.mocked(syncReviewDocumentsForUser).mockResolvedValue({
      failedIds: [],
      savedIds: [],
      sourceImages: [],
    });
  });

  it("rejects an oversized declared body before storage use", async () => {
    const request = createRequest("{}", {
      "Content-Length": String(MAX_REQUEST_BODY_SIZE + 1),
    });

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Request body is too large." });
    expect(request.bodyUsed).toBe(false);
    expect(syncReviewDocumentsForUser).not.toHaveBeenCalled();
  });

  it("preserves legitimate review sync", async () => {
    const response = await POST(createRequest(JSON.stringify({ documents: [] })));

    expect(response.status).toBe(200);
    expect(syncReviewDocumentsForUser).toHaveBeenCalledWith("user-1", []);
  });
});

function createRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://iroguide.com/api/reviews/sync", {
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
