import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const operations = vi.hoisted(() => ({
  dispatchNextCommunityEvent: vi.fn(),
}));

vi.mock("@/server/community-operations", () => operations);

import { POST } from "./route";

const workerKey = "community-worker-key-that-is-at-least-32-characters";

function request(authorization?: string) {
  return new Request("https://iroguide.com/api/internal/community/dispatch", {
    method: "POST",
    headers: {
      ...(authorization ? { authorization } : {}),
      "x-worker-id": "scheduled-community-worker",
    },
  });
}

describe("POST /api/internal/community/dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("IROGUIDE_COMMUNITY_SAFETY_MODE", "closed");
    vi.stubEnv("IROGUIDE_COMMUNITY_AUDIT_HMAC_KEY", "audit-key-that-is-at-least-32-characters");
    vi.stubEnv("IROGUIDE_COMMUNITY_MODERATOR_UIDS", "moderator-a");
    vi.stubEnv("IROGUIDE_COMMUNITY_SENIOR_MODERATOR_UIDS", "senior-a");
    vi.stubEnv("IROGUIDE_INTERNAL_WORKER_KEY", workerKey);
    operations.dispatchNextCommunityEvent.mockResolvedValue({ delivered: false, dispatched: false });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("conceals the worker while Community remains closed", async () => {
    const response = await POST(request(`Bearer ${workerKey}`));

    expect(response.status).toBe(404);
    expect(operations.dispatchNextCommunityEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid worker credential when staff mode is ready", async () => {
    vi.stubEnv("IROGUIDE_COMMUNITY_SAFETY_MODE", "staff");

    const response = await POST(request("Bearer incorrect-worker-key"));

    expect(response.status).toBe(401);
    expect(operations.dispatchNextCommunityEvent).not.toHaveBeenCalled();
  });

  it("dispatches one event for an authenticated staff-mode worker", async () => {
    vi.stubEnv("IROGUIDE_COMMUNITY_SAFETY_MODE", "staff");

    const response = await POST(request(`Bearer ${workerKey}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ delivered: false, dispatched: false });
    expect(operations.dispatchNextCommunityEvent).toHaveBeenCalledWith("scheduled-community-worker");
  });

  it("contains dispatcher failures without exposing internal details", async () => {
    vi.stubEnv("IROGUIDE_COMMUNITY_SAFETY_MODE", "staff");
    operations.dispatchNextCommunityEvent.mockRejectedValue(new Error("private queue detail"));

    const response = await POST(request(`Bearer ${workerKey}`));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Community work could not be dispatched." });
  });
});
