import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generators = vi.hoisted(() => ({
  comparison: vi.fn(),
  followUp: vi.fn(),
  improvement: vi.fn(),
}));

vi.mock("@/server/firebase-admin", () => ({
  FirebaseAdminUnavailableError: class FirebaseAdminUnavailableError extends Error {},
  FirebaseTokenVerificationError: class FirebaseTokenVerificationError extends Error {},
  verifyFirebaseIdToken: vi.fn(),
}));

vi.mock("@/domain/demo-follow-up", () => ({ createDemoFollowUp: generators.followUp }));
vi.mock("@/domain/demo-comparison", () => ({ createDemoComparison: generators.comparison }));
vi.mock("@/domain/demo-review", () => ({ createDemoImprovementPlan: generators.improvement }));

import { verifyFirebaseIdToken } from "@/server/firebase-admin";
import { POST as postComparison } from "./comparisons/route";
import { POST as postFollowUp } from "./follow-ups/route";
import { POST as postImprovement } from "./improvements/route";

const routes = [
  { name: "comparison", path: "comparisons", post: postComparison, generator: generators.comparison },
  { name: "follow-up", path: "follow-ups", post: postFollowUp, generator: generators.followUp },
  { name: "improvement", path: "improvements", post: postImprovement, generator: generators.improvement },
] as const;

describe("secondary review generation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("IROGUIDE_LAUNCH_PROFILE", "free");
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "verified-entitled",
      sub: "verified-entitled",
      auth_time: 1,
      iat: 1,
      email_verified: true,
      iroguide_review_entitled: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(routes)("denies authenticated $name generation before its generator runs", async ({ path, post, generator }) => {
    const response = await post(createRequest(path, true));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: expect.stringContaining("not available"),
    });
    expect(generator).not.toHaveBeenCalled();
    expect(verifyFirebaseIdToken).not.toHaveBeenCalled();
  });

  it.each(routes)("fails closed before authentication for $name", async ({ path, post, generator }) => {
    const response = await post(createRequest(path, false));

    expect(response.status).toBe(404);
    expect(verifyFirebaseIdToken).not.toHaveBeenCalled();
    expect(generator).not.toHaveBeenCalled();
  });
});

function createRequest(path: string, authenticated: boolean) {
  return new Request(`https://iroguide.com/api/${path}`, {
    method: "POST",
    headers: {
      ...(authenticated ? { Authorization: "Bearer valid-token" } : {}),
      "Content-Type": "application/json",
      Origin: "https://iroguide.com",
    },
    body: "{}",
  });
}
