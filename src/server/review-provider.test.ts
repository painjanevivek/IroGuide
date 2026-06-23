import { afterEach, describe, expect, it, vi } from "vitest";
import { createReview, getReviewProvider, ReviewProviderUnavailableError } from "./review-provider";
import type { ReviewRequest } from "@/domain/review";

const request: ReviewRequest = {
  category: "logo",
  mode: "mentor",
  file: { name: "logo.png", type: "image/png", size: 120_000 },
  brief: {
    audience: "Teen designers",
    purpose: "Build trust for a portfolio site",
    style: "Bold and minimal",
    goal: "For website logo",
    concern: "The mark feels too plain.",
  },
};

describe("review provider routing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the deterministic review provider by default", async () => {
    const review = await createReview(request);

    expect(getReviewProvider().name).toBe("demo");
    expect(review.provider).toBe("demo");
  });

  it("fails clearly when live vision mode is enabled without an endpoint", async () => {
    vi.stubEnv("IROGUIDE_REVIEW_PROVIDER", "live");
    vi.stubEnv("IROGUIDE_VISION_REVIEW_ENDPOINT", "");

    await expect(createReview(request)).rejects.toBeInstanceOf(ReviewProviderUnavailableError);
  });
});
