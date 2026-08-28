import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildAccountExport: vi.fn(),
  enforceRateLimit: vi.fn(),
  verifyRecentFirebaseIdToken: vi.fn(),
}));

vi.mock("@/server/account-export", () => ({
  AccountExportTooLargeError: class AccountExportTooLargeError extends Error { readonly status = 413; },
  buildAccountExport: mocks.buildAccountExport,
}));
vi.mock("@/server/api-security", async () => {
  const { NextResponse } = await import("next/server");
  return {
    createPublicRequestContext: () => ({ requestId: "request-1", route: "api.account.export", startedAt: Date.now() }),
    enforceRateLimit: mocks.enforceRateLimit,
    enforceSameOriginRequest: (request: Request) => request.headers.get("origin") === "https://iroguide.com" ? { allowed: true } : { response: NextResponse.json({ error: "Origin blocked" }, { status: 403 }) },
    requireContentType: () => ({ allowed: true }),
  };
});
vi.mock("@/server/firebase-admin", () => ({
  FirebaseTokenVerificationError: class FirebaseTokenVerificationError extends Error {},
  verifyRecentFirebaseIdToken: mocks.verifyRecentFirebaseIdToken,
}));
vi.mock("@/server/observability", () => ({ jsonHeaders: () => ({ "Cache-Control": "no-store", "x-request-id": "request-1" }), logRequestEvent: vi.fn() }));

import { POST } from "./route";

describe("account export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ result: { allowed: true } });
    mocks.verifyRecentFirebaseIdToken.mockResolvedValue({ uid: "owner" });
    mocks.buildAccountExport.mockResolvedValue({ schemaVersion: 1, exportedAt: "2026-08-28T10:00:00.000Z", profile: {}, learning: {}, reviews: [], reviewDrafts: [], comparisons: [], messages: [], caseStudies: [] });
  });

  it("binds a recent verified owner and returns a no-store JSON attachment", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.buildAccountExport).toHaveBeenCalledWith("owner");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toContain("iroguide-account-export-2026-08-28.json");
    expect(await response.text()).not.toContain("signedUrl");
  });

  it("rejects cross-origin and missing authentication before export work", async () => {
    const crossOrigin = request();
    crossOrigin.headers.set("Origin", "https://attacker.example");
    expect((await POST(crossOrigin)).status).toBe(403);
    expect((await POST(new Request("https://iroguide.com/api/account/export", { method: "POST", headers: { Origin: "https://iroguide.com", "Content-Type": "application/json" }, body: "{}" }))).status).toBe(401);
    expect(mocks.buildAccountExport).not.toHaveBeenCalled();
  });
});

function request() {
  return new Request("https://iroguide.com/api/account/export", { method: "POST", headers: { Authorization: "Bearer recent-token", "Content-Type": "application/json", Origin: "https://iroguide.com" }, body: JSON.stringify({ schemaVersion: 1 }) });
}
