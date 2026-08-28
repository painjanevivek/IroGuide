import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ admin: true }));
const mocks = vi.hoisted(() => ({ apply: vi.fn(), list: vi.fn(), requireUser: vi.fn() }));

vi.mock("@/server/access-operations", () => ({ applyReviewAccessDecision: mocks.apply, listReviewAccessCandidates: mocks.list }));
vi.mock("@/server/admin-authorization", () => ({ isIroGuideAdmin: () => state.admin }));
vi.mock("@/server/api-security", () => ({
  enforceRateLimit: async () => ({ result: { allowed: true } }),
  enforceSameOriginRequest: () => ({ allowed: true }),
  requireContentType: () => ({ allowed: true }),
  requireVerifiedFirebaseUser: mocks.requireUser,
}));
vi.mock("@/server/observability", () => ({ createRequestContext: () => ({ requestId: "request-1", route: "api.admin.access_interest", startedAt: Date.now() }), jsonHeaders: () => ({ "Cache-Control": "no-store" }), logRequestEvent: vi.fn() }));

import { GET, POST } from "./route";

describe("access-interest operator route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.admin = true;
    mocks.requireUser.mockResolvedValue({ user: { uid: "operator", email_verified: true }, userLogId: "safe-operator" });
    mocks.list.mockResolvedValue({ partial: false, records: [] });
    mocks.apply.mockResolvedValue({ targetUserId: "target", revision: 1, status: "invited" });
  });

  it("passes only allowlisted categorical filters to bounded storage", async () => {
    const response = await GET(request("GET", undefined, "?cohort=freelancer&category=ui&age=0-7-days&status=interested"));
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith({ cohort: "freelancer", category: "ui", age: "0-7-days", status: "interested" });
  });

  it("rejects invalid filters without querying candidate storage", async () => {
    const response = await GET(request("GET", undefined, "?status=approved"));
    expect(response.status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("binds the verified operator as actor and rejects non-operators", async () => {
    const command = { schemaVersion: 1, eventId: "018f1a80-7b5a-7c61-a9be-2f38de60ec98", targetUserId: "target", expectedRevision: 0, decision: "approve", reasonCode: "cohort-fit" };
    expect((await POST(request("POST", command))).status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith("operator", command);
    state.admin = false;
    expect((await POST(request("POST", command))).status).toBe(403);
  });
});

function request(method: string, body?: Record<string, unknown>, query = "") {
  return new Request(`https://iroguide.com/api/admin/access-interest${query}`, { method, headers: { Authorization: "Bearer token", "Content-Type": "application/json", Origin: "https://iroguide.com" }, body: body ? JSON.stringify(body) : undefined });
}
