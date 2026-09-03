import { beforeEach, describe, expect, it, vi } from "vitest";

const gateMock = vi.hoisted(() => ({ serving: false }));
const rateLimitMock = vi.hoisted(() => ({ check: vi.fn() }));

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
  getCommunityAccountRiskState: vi.fn(),
  listCommunityComments: vi.fn(),
  listCommunityProjections: vi.fn(),
  mutateCommunity: vi.fn(),
}));

vi.mock("@/server/community-safety-config", () => ({
  getCommunitySafetyStatus: () => ({ mode: gateMock.serving ? "staff" : "closed", ready: gateMock.serving }),
}));

vi.mock("@/server/launch-capabilities", () => ({
  getServerLaunchCapabilities: () => ({ community: gateMock.serving }),
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimit: rateLimitMock.check,
  getRateLimitHeaders: () => ({}),
}));

import { requireVerifiedFirebaseUser } from "@/server/api-security";
import { mutateCommunity } from "@/server/community-storage";
import { getCommunityAccountRiskState } from "@/server/community-storage";
import { checkRateLimit } from "@/server/rate-limit";
import { GET, POST } from "./route";

describe("community launch gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gateMock.serving = false;
    rateLimitMock.check.mockResolvedValue({ allowed: true, limit: 10, remaining: 9, resetAt: Date.now() + 60_000, retryAfterSeconds: 60 });
    vi.mocked(requireVerifiedFirebaseUser).mockResolvedValue({
      user: { uid: "user-a", sub: "user-a", auth_time: 1, iat: 1 },
      userLogId: "safe-user-a",
    });
    vi.mocked(getCommunityAccountRiskState).mockResolvedValue("clear");
    vi.mocked(mutateCommunity).mockResolvedValue({ id: "result-a" });
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

  it("closes public reads before authentication work", async () => {
    const response = await GET(new Request("https://iroguide.com/api/community", { headers: { Origin: "https://iroguide.com" } }));
    expect(response.status).toBe(404);
    expect(requireVerifiedFirebaseUser).not.toHaveBeenCalled();
  });

  it("applies raw account and global target limits independently of client-derived buckets", async () => {
    gateMock.serving = true;
    const response = await POST(createRequest({
      action: "report",
      targetType: "post",
      targetId: "post-a",
      reason: "spam",
    }));

    expect(response.status).toBe(200);
    expect(checkRateLimit).toHaveBeenNthCalledWith(1, {
      key: "community-account:user-a",
      limit: 120,
      windowMs: 10 * 60 * 1000,
    });
    expect(checkRateLimit).toHaveBeenNthCalledWith(2, {
      key: "community-account-action:user-a:report",
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    expect(checkRateLimit).toHaveBeenNthCalledWith(3, {
      key: "community-target:report:post:post-a",
      limit: 500,
      windowMs: 60 * 60 * 1000,
    });
    expect(mutateCommunity).toHaveBeenCalledWith(expect.objectContaining({ uid: "user-a" }), expect.objectContaining({ action: "report", targetId: "post-a" }));
  });
});

function createRequest(body: Record<string, unknown> = { action: "publish", reviewId: "review-1" }) {
  return new Request("https://iroguide.com/api/community", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
      Origin: "https://iroguide.com",
    },
    body: JSON.stringify(body),
  });
}
