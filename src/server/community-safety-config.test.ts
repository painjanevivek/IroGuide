import { describe, expect, it } from "vitest";
import { getCommunitySafetyStatus, isCommunityModerator, isCommunitySeniorModerator } from "./community-safety-config";

describe("community safety configuration", () => {
  it("is a ready closed capability by default", () => {
    expect(getCommunitySafetyStatus({})).toMatchObject({ mode: "closed", ready: true });
  });

  it("requires audit and independent moderation roles for staff mode", () => {
    expect(getCommunitySafetyStatus({ IROGUIDE_COMMUNITY_SAFETY_MODE: "staff" }).ready).toBe(false);
    const env = {
      IROGUIDE_COMMUNITY_SAFETY_MODE: "staff",
      IROGUIDE_COMMUNITY_AUDIT_HMAC_KEY: "k".repeat(32),
      IROGUIDE_COMMUNITY_MODERATOR_UIDS: "moderator-a",
      IROGUIDE_COMMUNITY_SENIOR_MODERATOR_UIDS: "moderator-b",
    };
    expect(getCommunitySafetyStatus(env).ready).toBe(true);
    expect(isCommunityModerator("moderator-a", env)).toBe(true);
    expect(isCommunitySeniorModerator("moderator-a", env)).toBe(false);
    expect(isCommunitySeniorModerator("moderator-b", env)).toBe(true);
  });
});
