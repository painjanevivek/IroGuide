import { describe, expect, it } from "vitest";
import { productCapabilityNames, resolveLaunchCapabilities } from "./launch-capabilities";

describe("launch capabilities", () => {
  it("disables every capability by default in every profile", () => {
    for (const input of [
      { nodeEnv: "production", launchProfile: "free" },
      { nodeEnv: "production", launchProfile: "full" },
      { nodeEnv: "development" },
    ]) {
      const capabilities = resolveLaunchCapabilities(input);
      for (const capability of productCapabilityNames) expect(capabilities[capability]).toBe(false);
    }
  });

  it("enables only explicitly named capabilities", () => {
    expect(resolveLaunchCapabilities({
      nodeEnv: "production",
      launchProfile: "free",
      capabilities: { guidedLearning: "true", productEvidence: "true" },
    })).toMatchObject({
      profile: "free",
      guidedLearning: true,
      productEvidence: true,
      liveCritique: false,
      improvementTracking: false,
    });
  });

  it.each([undefined, "", "unexpected", "FULL "]) (
    "fails closed to free in production for %s",
    (launchProfile) => {
      const result = resolveLaunchCapabilities({ nodeEnv: "production", launchProfile });
      expect(result.profile).toBe("free");
      for (const capability of productCapabilityNames) expect(result[capability]).toBe(false);
    },
  );

  it("keeps guided learning closed unless it is explicitly enabled", () => {
    expect(resolveLaunchCapabilities({ nodeEnv: "production", launchProfile: "free" }).guidedLearning).toBe(false);
    expect(resolveLaunchCapabilities({ nodeEnv: "production", launchProfile: "free", capabilities: { guidedLearning: "TRUE" } }).guidedLearning).toBe(false);
  });
});
