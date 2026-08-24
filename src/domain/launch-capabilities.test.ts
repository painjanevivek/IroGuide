import { describe, expect, it } from "vitest";
import { resolveLaunchCapabilities } from "./launch-capabilities";

describe("launch capabilities", () => {
  it("disables every optional paid capability in the free profile", () => {
    expect(resolveLaunchCapabilities({ nodeEnv: "production", launchProfile: "free" })).toEqual({
      profile: "free",
      aiCritique: false,
      bugReportEmail: false,
      community: false,
      sourceImageStorage: false,
    });
  });

  it("enables every optional capability only for the explicit full profile", () => {
    expect(resolveLaunchCapabilities({ nodeEnv: "production", launchProfile: "full" })).toEqual({
      profile: "full",
      aiCritique: true,
      bugReportEmail: true,
      community: false,
      sourceImageStorage: true,
    });
  });

  it("keeps local critique available in the default development profile", () => {
    expect(resolveLaunchCapabilities({ nodeEnv: "development" })).toEqual({
      profile: "development",
      aiCritique: true,
      bugReportEmail: false,
      community: false,
      sourceImageStorage: false,
    });
  });

  it.each([undefined, "", "unexpected", "FULL "]) (
    "fails closed to free in production for %s",
    (launchProfile) => {
      expect(resolveLaunchCapabilities({ nodeEnv: "production", launchProfile })).toEqual({
        profile: "free",
        aiCritique: false,
        bugReportEmail: false,
        community: false,
        sourceImageStorage: false,
      });
    },
  );
});
