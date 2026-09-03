import { describe, expect, it } from "vitest";
import { getCohortWelcome, getRecommendedCritiqueStyle, getRecommendedSample } from "./onboarding";

describe("onboarding recommendations", () => {
  it("personalizes presentation without changing the standards", () => {
    expect(getRecommendedCritiqueStyle("beginner-designer")).toBe("friendly");
    expect(getRecommendedCritiqueStyle("freelancer")).toBe("direct");
    expect(getRecommendedCritiqueStyle("ui-ux-designer")).toBe("mentor");
    expect(getRecommendedSample("freelancer")).toBe("signal-noise-direct");
    expect(getCohortWelcome("ui-ux-designer")).toContain("evidence-based");
  });
});
