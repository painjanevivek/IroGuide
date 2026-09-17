import { describe, expect, it } from "vitest";
import { hasReviewGenerationAccess } from "./review-access";

describe("review generation access", () => {
  it("requires a verified authenticated identity", () => {
    expect(hasReviewGenerationAccess({
      uid: "new-account",
      email_verified: false,
    })).toBe(false);

    expect(hasReviewGenerationAccess({
      uid: "",
      email_verified: true,
    })).toBe(false);
  });

  it("allows every verified account without an invitation or entitlement", () => {
    expect(hasReviewGenerationAccess({
      uid: "verified-account",
      email_verified: true,
    })).toBe(true);
    expect(hasReviewGenerationAccess({
      uid: "another-verified-account",
      email_verified: true,
    })).toBe(true);
  });
});
