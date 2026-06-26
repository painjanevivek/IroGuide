import { afterEach, describe, expect, it, vi } from "vitest";
import { getE2ELocalPrivateSourceImageUrl } from "./e2e-local-auth";

describe("e2e local auth private storage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves only the signed-in user's local private source image path", () => {
    vi.stubEnv("NEXT_PUBLIC_E2E_LOCAL_AUTH", "true");

    expect(getE2ELocalPrivateSourceImageUrl("users/user-a/reviews/review-1/source.png", "user-a")).toBe(
      "/__e2e__/private-storage/users/user-a/reviews/review-1/source.png",
    );
    expect(getE2ELocalPrivateSourceImageUrl("users/user-b/reviews/review-1/source.png", "user-a")).toBeNull();
    expect(getE2ELocalPrivateSourceImageUrl("users/user-a/reviews/../source.png", "user-a")).toBeNull();
  });

  it("stays unavailable outside local E2E auth mode", () => {
    vi.stubEnv("NEXT_PUBLIC_E2E_LOCAL_AUTH", "false");

    expect(getE2ELocalPrivateSourceImageUrl("users/user-a/reviews/review-1/source.png", "user-a")).toBeNull();
  });
});
