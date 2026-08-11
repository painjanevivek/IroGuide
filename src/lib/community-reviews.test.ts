import { describe, expect, it } from "vitest";
import { createDemoReview } from "@/domain/demo-review";
import type { ReviewRequest } from "@/domain/review";
import { createStoredReviewDocument } from "@/domain/review-storage";
import { createTrustedReviewDocument } from "@/server/review-provenance";
import { getPublishableCommunityReviews, toCommunitySavedReview } from "./community-reviews";

const request: ReviewRequest = {
  category: "logo",
  mode: "mentor",
  file: { name: "mark.png", type: "image/png", size: 1024 },
  brief: {
    audience: "Independent designers",
    purpose: "Evaluate a brand mark",
    style: "Bold minimal identity",
    goal: "Improve first impression",
    concern: "",
  },
};

describe("Community saved review eligibility", () => {
  it("keeps legacy history visible but excludes it from publishable reviews", () => {
    const document = createStoredReviewDocument({
      category: "logo",
      review: createDemoReview(request),
      userId: "user-a",
    });
    const savedReview = toCommunitySavedReview(document.id, document);

    expect(savedReview).toMatchObject({ trustState: "legacy-unverified" });
    expect(getPublishableCommunityReviews([savedReview!])).toEqual([]);
  });

  it("includes only server-attested reviews in Community publishing choices", () => {
    const document = createTrustedReviewDocument({
      category: "logo",
      review: createDemoReview(request),
      userId: "user-a",
    });
    const savedReview = toCommunitySavedReview(document.id, document);

    expect(savedReview).toMatchObject({ trustState: "server-verified" });
    expect(getPublishableCommunityReviews([savedReview!])).toEqual([savedReview]);
  });
});
