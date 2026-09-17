import { describe, expect, it } from "vitest";
import { productCapabilityNames, type LaunchCapabilities } from "@/domain/launch-capabilities";
import { createRequestContext } from "./observability";
import { enforceReviewGenerationPolicy } from "./review-generation-policy";

const freeCapabilities: LaunchCapabilities = {
  profile: "free",
  ...Object.fromEntries(productCapabilityNames.map((capability) => [capability, false])) as Record<(typeof productCapabilityNames)[number], boolean>,
};

const fullCapabilities: LaunchCapabilities = {
  ...freeCapabilities,
  profile: "full",
  liveCritique: true,
  bugReportEmail: true,
  guidedLearning: true,
  sourceImageStorage: true,
};

describe("review generation policy", () => {
  it("denies a verified user when critique is disabled", async () => {
    const result = enforceReviewGenerationPolicy({
      capabilities: freeCapabilities,
      context: getContext(),
      eventPrefix: "review",
      user: verifiedUser,
    });

    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error("Expected free mode to be denied.");
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({
      error: "Live critique is unavailable. Continue with the free guided practice instead.",
    });
  });

  it("denies an unverified full-profile user", async () => {
    const result = enforceReviewGenerationPolicy({
      capabilities: fullCapabilities,
      context: getContext(),
      eventPrefix: "review",
      user: { ...verifiedUser, email_verified: false },
    });

    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error("Expected account access to be denied.");
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({
      error: "Verify your email before starting a personalized critique.",
    });
  });

  it("allows every verified user when critique is enabled", () => {
    expect(enforceReviewGenerationPolicy({
      capabilities: fullCapabilities,
      context: getContext(),
      eventPrefix: "review",
      user: verifiedUser,
    })).toEqual({ allowed: true });
  });
});

const verifiedUser = {
  uid: "verified-user",
  email_verified: true,
};

function getContext() {
  return createRequestContext(new Request("https://iroguide.com/api/reviews"), "api.reviews.create");
}
