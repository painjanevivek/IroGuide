import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  guidedLearning: true,
  originBlocked: false,
  authenticated: true,
}));

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  createSelfReview: vi.fn(),
  deleteDesignBrief: vi.fn(),
  deleteSelfReviews: vi.fn(),
  enforceRateLimit: vi.fn(),
  getAccountExperienceBundle: vi.fn(),
  getDashboardGuide: vi.fn(),
  listDesignBriefs: vi.fn(),
  listSelfReviews: vi.fn(),
  patchAccountExperience: vi.fn(),
  putDesignBrief: vi.fn(),
  recordAccessInterest: vi.fn(),
  requireVerifiedFirebaseUser: vi.fn(),
  revokeAccessInterest: vi.fn(),
  provider: vi.fn(),
  storage: vi.fn(),
  email: vi.fn(),
  community: vi.fn(),
}));

vi.mock("@/server/api-security", async () => {
  const { NextResponse } = await import("next/server");
  return {
    createPublicRequestContext: (_request: Request, route: string) => ({ requestId: "request-1", route, startedAt: Date.now() }),
    enforceRateLimit: mocks.enforceRateLimit,
    enforceSameOriginRequest: () => state.originBlocked
      ? { response: NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 }) }
      : { allowed: true },
    requireContentType: (request: Request) => request.headers.get("content-type")?.startsWith("application/json")
      ? { allowed: true }
      : { response: NextResponse.json({ error: "Request content type is not supported." }, { status: 415 }) },
    requireVerifiedFirebaseUser: mocks.requireVerifiedFirebaseUser,
  };
});

vi.mock("@/server/launch-capabilities", () => ({
  getServerLaunchCapabilities: () => ({ guidedLearning: state.guidedLearning }),
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getRateLimitHeaders: () => ({ "x-ratelimit-remaining": "59" }),
}));

vi.mock("@/server/account-deletion-lock", () => ({
  AccountDeletionInProgressError: class AccountDeletionInProgressError extends Error {},
}));

vi.mock("@/server/firebase-admin", () => ({
  FirebaseAdminUnavailableError: class FirebaseAdminUnavailableError extends Error {},
}));

vi.mock("@/server/product-activation-storage", () => {
  class ActivationConflictError extends Error {
    readonly status = 409;
    constructor(message = "Conflict", readonly currentRevision?: number) { super(message); }
  }
  class ActivationNotFoundError extends Error { readonly status = 404; }
  class ActivationDeletionIncompleteError extends Error {
    readonly status = 503;
    constructor(readonly result: unknown) { super("Cleanup incomplete"); }
  }
  return {
    ActivationConflictError,
    ActivationDeletionIncompleteError,
    ActivationNotFoundError,
    clearLearningHistory: vi.fn(),
    createSelfReview: mocks.createSelfReview,
    deleteDesignBrief: mocks.deleteDesignBrief,
    deleteSelfReviews: mocks.deleteSelfReviews,
    getAccountExperienceBundle: mocks.getAccountExperienceBundle,
    importLegacyDesignBrief: vi.fn().mockResolvedValue(null),
    listDesignBriefs: mocks.listDesignBriefs,
    listSelfReviews: mocks.listSelfReviews,
    patchAccountExperience: mocks.patchAccountExperience,
    patchSelfReview: vi.fn(),
    putDesignBrief: mocks.putDesignBrief,
    recordAccessInterest: mocks.recordAccessInterest,
    revokeAccessInterest: mocks.revokeAccessInterest,
    toPublicActivationRecord: (record: Record<string, unknown>) => Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== "userId" && key !== "recentMutationIds"),
    ),
  };
});

vi.mock("@/server/dashboard-guide", () => ({
  getDashboardGuide: mocks.getDashboardGuide,
}));

import { ActivationConflictError } from "@/server/product-activation-storage";
import { AccountDeletionInProgressError } from "@/server/account-deletion-lock";
import { GET as getExperience, PATCH as patchExperience } from "./account/experience/route";
import { POST as createReview } from "./self-reviews/route";
import { PUT as putBrief } from "./design-briefs/route";
import { DELETE as revokeInterest, POST as createInterest } from "./access-interest/route";
import { GET as getDashboardGuide } from "./dashboard/guide/route";

const storedExperience = {
  userId: "owner",
  recentMutationIds: ["mutation-123"],
  schemaVersion: 1,
  revision: 1,
  primaryRole: "freelancer",
};

describe("product activation API security envelope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guidedLearning = true;
    state.originBlocked = false;
    state.authenticated = true;
    mocks.requireVerifiedFirebaseUser.mockResolvedValue({
      user: { uid: "owner", sub: "owner", auth_time: 1, iat: 1 },
      userLogId: "safe-owner",
    });
    const allowed = { allowed: true, limit: 60, remaining: 59, resetAt: Date.now() + 60_000, retryAfterSeconds: 0 };
    mocks.checkRateLimit.mockResolvedValue(allowed);
    mocks.enforceRateLimit.mockResolvedValue({ result: allowed });
    mocks.getAccountExperienceBundle.mockResolvedValue({ experience: storedExperience, sampleProgress: [], accessInterest: null });
    mocks.patchAccountExperience.mockResolvedValue({ experience: storedExperience, sampleProgress: [], accessInterest: null });
    mocks.getDashboardGuide.mockResolvedValue({ schemaVersion: 1, state: "new-account", nextAction: { id: "finish-onboarding" }, checklist: [], recentActivity: [] });
  });

  it("fails closed before authentication or persistence work", async () => {
    state.guidedLearning = false;
    const response = await getExperience(request("/api/account/experience"));
    expect(response.status).toBe(404);
    expect(mocks.requireVerifiedFirebaseUser).not.toHaveBeenCalled();
    expect(mocks.getAccountExperienceBundle).not.toHaveBeenCalled();
  });

  it("blocks cross-origin mutation before authentication", async () => {
    state.originBlocked = true;
    const response = await patchExperience(request("/api/account/experience", validExperiencePatch(), "PATCH"));
    expect(response.status).toBe(403);
    expect(mocks.requireVerifiedFirebaseUser).not.toHaveBeenCalled();
  });

  it("rejects missing authentication", async () => {
    const { NextResponse } = await import("next/server");
    mocks.requireVerifiedFirebaseUser.mockResolvedValue({ response: NextResponse.json({ error: "Sign in" }, { status: 401 }) });
    const response = await getExperience(request("/api/account/experience"));
    expect(response.status).toBe(401);
    expect(mocks.getAccountExperienceBundle).not.toHaveBeenCalled();
  });

  it("rejects malformed, oversized, and ownership-injecting bodies", async () => {
    const malformed = await patchExperience(rawRequest("/api/account/experience", "{", "PATCH"));
    expect(malformed.status).toBe(400);

    const oversized = await patchExperience(rawRequest("/api/account/experience", "{}", "PATCH", { "Content-Length": "40000" }));
    expect(oversized.status).toBe(413);

    const injected = await patchExperience(request("/api/account/experience", { ...validExperiencePatch(), userId: "attacker" }, "PATCH"));
    expect(injected.status).toBe(400);
    expect(mocks.patchAccountExperience).not.toHaveBeenCalled();
  });

  it("uses only the verified owner and omits internal persistence fields", async () => {
    const response = await patchExperience(request("/api/account/experience", validExperiencePatch(), "PATCH"));
    expect(response.status).toBe(200);
    expect(mocks.patchAccountExperience).toHaveBeenCalledWith("owner", expect.objectContaining({ mutationId: "mutation-123" }));
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({ experience: { schemaVersion: 1, revision: 1, primaryRole: "freelancer" } });
    const body = await (await patchExperience(request("/api/account/experience", validExperiencePatch(), "PATCH"))).json();
    expect(body.experience).not.toHaveProperty("userId");
    expect(body.experience).not.toHaveProperty("recentMutationIds");
  });

  it("returns an actionable stale-version conflict without leaking stored data", async () => {
    mocks.patchAccountExperience.mockRejectedValue(new ActivationConflictError("Refresh and retry.", 4));
    const response = await patchExperience(request("/api/account/experience", validExperiencePatch(), "PATCH"));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Refresh and retry.", currentRevision: 4 });
  });

  it("enforces an account bucket before a client-derived bucket", async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, limit: 60, remaining: 0, resetAt: Date.now() + 60_000, retryAfterSeconds: 60 });
    const response = await getExperience(request("/api/account/experience"));
    expect(response.status).toBe(429);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.getAccountExperienceBundle).not.toHaveBeenCalled();
  });

  it("fails closed when the rate-limit adapter is unavailable", async () => {
    mocks.checkRateLimit.mockRejectedValue(new Error("adapter offline"));
    const response = await getExperience(request("/api/account/experience"));
    expect(response.status).toBe(503);
    expect(mocks.getAccountExperienceBundle).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("adapter offline");
  });

  it("maps persistence outages to a no-store 503 response", async () => {
    mocks.getAccountExperienceBundle.mockRejectedValue(new Error("firestore secret detail"));
    const response = await getExperience(request("/api/account/experience"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).not.toContain("secret detail");
  });

  it("returns a locked response while account deletion is in progress", async () => {
    mocks.getAccountExperienceBundle.mockRejectedValue(new AccountDeletionInProgressError());
    const response = await getExperience(request("/api/account/experience"));
    expect(response.status).toBe(423);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("locked") });
  });

  it("routes bounded records through owner-scoped storage without external free-mode effects", async () => {
    mocks.createSelfReview.mockResolvedValue({ ...storedExperience, id: "session-a" });
    mocks.putDesignBrief.mockResolvedValue({ ...storedExperience, id: "brief-a" });
    mocks.recordAccessInterest.mockResolvedValue({ ...storedExperience, status: "interested" });
    mocks.revokeAccessInterest.mockResolvedValue({ ...storedExperience, status: "revoked" });

    expect((await createReview(request("/api/self-reviews", validSelfReview(), "POST"))).status).toBe(201);
    expect((await putBrief(request("/api/design-briefs", validBrief(), "PUT"))).status).toBe(200);
    expect((await createInterest(request("/api/access-interest", validInterest(), "POST"))).status).toBe(201);
    expect((await revokeInterest(request("/api/access-interest", { schemaVersion: 1, programVersion: "provider-alpha-v1", mutationId: "revoke-12345", expectedRevision: 0 }, "DELETE"))).status).toBe(200);

    expect(mocks.createSelfReview).toHaveBeenCalledWith("owner", expect.anything());
    expect(mocks.putDesignBrief).toHaveBeenCalledWith("owner", expect.anything());
    expect(mocks.recordAccessInterest).toHaveBeenCalledWith("owner", expect.anything());
    expect(mocks.revokeAccessInterest).toHaveBeenCalledWith("owner", expect.anything());
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.storage).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
    expect(mocks.community).not.toHaveBeenCalled();
  });

  it("returns a private no-store dashboard guide for only the verified owner", async () => {
    const response = await getDashboardGuide(request("/api/dashboard/guide"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.getDashboardGuide).toHaveBeenCalledWith("owner");
    expect(await response.json()).toMatchObject({ schemaVersion: 1, state: "new-account" });
  });
});

function validExperiencePatch() {
  return { schemaVersion: 1, expectedRevision: 0, mutationId: "mutation-123", action: "update", changes: { primaryRole: "freelancer" } };
}

function validSelfReview() {
  return { schemaVersion: 1, id: "session-a", mutationId: "mutation-123", rubricVersion: "rubric-v1", category: "ui", responses: [] };
}

function validBrief() {
  return {
    schemaVersion: 1, id: "brief-a", expectedRevision: null, mutationId: "mutation-123", category: "ui",
    audience: "Designers", purpose: "Practice", style: "Clear", goal: "Improve hierarchy", concern: "Clarity",
    constraints: "None", mode: "mentor", step: 1, flowVersion: "brief-v1", status: "draft",
  };
}

function validInterest() {
  return { schemaVersion: 1, programVersion: "provider-alpha-v1", expectedRevision: null, mutationId: "mutation-123", preferredCategory: "ui", clientWorkIntent: "client-safe-only", contactPermission: true };
}

function request(path: string, body?: Record<string, unknown>, method = "GET") {
  return rawRequest(path, body ? JSON.stringify(body) : undefined, method);
}

function rawRequest(path: string, body: string | undefined, method: string, extraHeaders: Record<string, string> = {}) {
  return new Request(`https://iroguide.com${path}`, {
    method,
    headers: { Authorization: "Bearer token", "Content-Type": "application/json", Origin: "https://iroguide.com", ...extraHeaders },
    body,
  });
}
