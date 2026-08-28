import type { User } from "firebase/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAccountExperience, saveAccountExperience } from "./account-experience-client";

describe("account experience client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads only a validated owner-safe bundle with an ID token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validBundle()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadAccountExperience(fakeUser())).resolves.toMatchObject({
      experience: { revision: 0, onboardingStatus: "not-started" },
      sampleProgress: [{ sampleId: "form-together-friendly", checkedActionIds: ["action-1"] }],
      accessInterest: null,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/account/experience", expect.objectContaining({
      cache: "no-store",
      headers: { Authorization: "Bearer owner-token" },
      method: "GET",
    }));
  });

  it("surfaces a stale-version conflict with the authoritative revision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "Progress changed in another tab.",
      currentRevision: 7,
    }), { status: 409, headers: { "Content-Type": "application/json" } })));

    await expect(saveAccountExperience(fakeUser(), {
      schemaVersion: 1,
      expectedRevision: 6,
      mutationId: "mutation-conflict-123",
      action: "update",
      changes: { onboardingStep: 2 },
    })).rejects.toMatchObject({
      name: "AccountExperienceRequestError",
      status: 409,
      currentRevision: 7,
    });
  });

  it.each([
    [401, "Your session expired."],
    [429, "Please wait before trying again."],
    [503, "Learning progress is temporarily unavailable."],
  ])("preserves actionable API failures (%s)", async (status, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(loadAccountExperience(fakeUser())).rejects.toMatchObject({ status, message });
  });

  it("rejects malformed success payloads instead of trusting partial state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ experience: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(loadAccountExperience(fakeUser())).rejects.toMatchObject({
      name: "AccountExperienceRequestError",
      status: 503,
    });
  });

  it("maps token and network failures to private recovery messages", async () => {
    const expiredUser = { getIdToken: vi.fn().mockRejectedValue(new Error("firebase detail")) } as unknown as User;
    await expect(loadAccountExperience(expiredUser)).rejects.toMatchObject({
      status: 401,
      message: "Your session expired. Sign in again to continue.",
    });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network detail")));
    await expect(loadAccountExperience(fakeUser())).rejects.toMatchObject({
      status: 503,
      message: "Learning progress could not reach the server. Your answers remain on this screen.",
    });
  });
});

function fakeUser() {
  return { getIdToken: vi.fn().mockResolvedValue("owner-token") } as unknown as User;
}

function validBundle() {
  return {
    experience: {
      schemaVersion: 1,
      revision: 0,
      primaryRole: null,
      primaryGoal: null,
      preferredMode: "mentor",
      selectedCategories: [],
      onboardingStatus: "not-started",
      onboardingStep: 0,
      programVersion: "free-activation-v1",
      steps: {},
      nextStep: "choose-path",
      dismissedHints: [],
      onboardingCompletedAt: null,
      lastVisitedAt: "2026-08-28T10:00:00.000Z",
      completedAt: null,
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    },
    sampleProgress: [{
      schemaVersion: 1,
      revision: 0,
      sampleId: "form-together-friendly",
      sampleVersion: "v1",
      activeFindingId: "finding-1",
      revealedFindingIds: ["finding-1"],
      checkedActionIds: ["action-1"],
      reflectionChoice: "needs-practice",
      completedAt: null,
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    }],
    accessInterest: null,
  };
}
