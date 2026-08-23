import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/api-security", () => ({
  createPublicRequestContext: () => ({ requestId: "request-1", route: "api.community.mutate", startedAt: Date.now() }),
  enforceRateLimit: () => ({}),
  enforceSameOriginRequest: () => ({}),
  requireContentType: () => ({}),
  requireVerifiedFirebaseUser: vi.fn(),
}));

vi.mock("@/server/community-storage", () => ({
  CommunityMutationError: class CommunityMutationError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
  mutateCommunity: vi.fn(),
}));

import { requireVerifiedFirebaseUser } from "@/server/api-security";
import { mutateCommunity } from "@/server/community-storage";
import { POST } from "./route";

describe("community launch gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireVerifiedFirebaseUser).mockResolvedValue({
      user: { uid: "user-a", sub: "user-a", iat: 1 },
      userLogId: "safe-user-a",
    });
  });

  it("returns unavailable before authentication or mutation work", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Community is not available in the current launch profile.",
    });
    expect(requireVerifiedFirebaseUser).not.toHaveBeenCalled();
    expect(mutateCommunity).not.toHaveBeenCalled();
  });
});

function createRequest() {
  return new Request("https://iroguide.com/api/community", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
      Origin: "https://iroguide.com",
    },
    body: JSON.stringify({ action: "publish", reviewId: "review-1" }),
  });
}
