import { describe, expect, it } from "vitest";
import { getSafeAuthReturnPath, withAuthReturn } from "./auth-return";

describe("auth return destinations", () => {
  it("preserves same-origin paths with query and hash", () => {
    expect(getSafeAuthReturnPath("/onboarding?step=2#goal")).toBe("/onboarding?step=2#goal");
  });

  it.each(["https://evil.example/path", "//evil.example/path", "/\\evil", "/auth?next=/dashboard", "javascript:alert(1)"])(
    "rejects unsafe or recursive destination %s",
    (value) => expect(getSafeAuthReturnPath(value)).toBe("/dashboard"),
  );

  it("encodes a validated destination into auth links", () => {
    expect(withAuthReturn("/auth/sign-up", "/onboarding?step=1")).toBe("/auth/sign-up?next=%2Fonboarding%3Fstep%3D1");
  });
});
