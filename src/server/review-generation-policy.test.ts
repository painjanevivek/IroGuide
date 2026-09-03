import { describe, expect, it } from "vitest";
import type { LaunchCapabilities } from "@/domain/launch-capabilities";
import { createRequestContext } from "./observability";
import { enforceReviewGenerationPolicy } from "./review-generation-policy";

const freeCapabilities: LaunchCapabilities = {
  profile: "free",
  aiCritique: false,
  bugReportEmail: false,
  community: false,
  guidedLearning: false,
  sourceImageStorage: false,
};

const fullCapabilities: LaunchCapabilities = {
  profile: "full",
  aiCritique: true,
  bugReportEmail: true,
  community: false,
  guidedLearning: true,
  sourceImageStorage: true,
};

describe("review generation policy", () => {
  it("denies an otherwise entitled user when critique is disabled", async () => {
    const result = enforceReviewGenerationPolicy({
      capabilities: freeCapabilities,
      context: getContext(),
      eventPrefix: "review",
      user: verifiedEntitledUser,
    });

    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error("Expected free mode to be denied.");
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({
      error: "AI critique is unavailable during IroGuide's free launch.",
    });
  });

  it.each([
    { name: "unverified", user: { ...verifiedEntitledUser, email_verified: false } },
    { name: "unentitled", user: { uid: "unentitled", email_verified: true } },
  ])("denies a full-profile $name user", async ({ user }) => {
    const result = enforceReviewGenerationPolicy({
      capabilities: fullCapabilities,
      context: getContext(),
      eventPrefix: "review",
      user,
    });

    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error("Expected account access to be denied.");
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({
      error: "Verify your email and request beta review access before starting a critique.",
    });
  });

  it("allows a verified entitled user only when critique is enabled", () => {
    expect(enforceReviewGenerationPolicy({
      capabilities: fullCapabilities,
      context: getContext(),
      eventPrefix: "review",
      user: verifiedEntitledUser,
    })).toEqual({ allowed: true });
  });
});

const verifiedEntitledUser = {
  uid: "verified-entitled",
  email_verified: true,
  iroguide_review_entitled: true,
};

function getContext() {
  return createRequestContext(new Request("https://iroguide.com/api/reviews"), "api.reviews.create");
}
