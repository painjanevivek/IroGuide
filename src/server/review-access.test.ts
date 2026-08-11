import { afterEach, describe, expect, it, vi } from "vitest";
import { hasReviewGenerationAccess } from "./review-access";

describe("review generation access", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies self-created accounts without verified email and entitlement", () => {
    expect(hasReviewGenerationAccess({
      uid: "new-account",
      email_verified: false,
      iroguide_review_entitled: true,
    })).toBe(false);

    expect(hasReviewGenerationAccess({
      uid: "verified-but-unapproved",
      email_verified: true,
    })).toBe(false);
  });

  it("allows a verified account with a signed entitlement claim", () => {
    expect(hasReviewGenerationAccess({
      uid: "approved-account",
      email_verified: true,
      iroguide_review_entitled: true,
    })).toBe(true);
  });

  it("allows a verified beta account from the server-side UID allowlist", () => {
    vi.stubEnv("IROGUIDE_REVIEW_ENTITLED_UIDS", "first-user, approved-account");

    expect(hasReviewGenerationAccess({
      uid: "approved-account",
      email_verified: true,
    })).toBe(true);
  });
});
