import { createDemoReview } from "@/domain/demo-review";
import { reviewOutputSchema, type ReviewOutput, type ReviewRequest } from "@/domain/review";

const LIVE_PROVIDER_MODES = new Set(["live", "vision"]);

const liveReviewResponseSchema = reviewOutputSchema.extend({
  provider: reviewOutputSchema.shape.provider.optional(),
});

export class ReviewProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewProviderUnavailableError";
  }
}

type ReviewProvider = {
  name: ReviewOutput["provider"];
  createReview: (request: ReviewRequest) => Promise<ReviewOutput>;
};

const demoReviewProvider: ReviewProvider = {
  name: "demo",
  createReview: async (request) => createDemoReview(request),
};

const liveVisionReviewProvider: ReviewProvider = {
  name: "live",
  async createReview(request) {
    const endpoint = process.env.IROGUIDE_VISION_REVIEW_ENDPOINT?.trim();
    if (!endpoint) {
      throw new ReviewProviderUnavailableError("Live vision critique is not configured yet.");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Live vision critique failed with status ${response.status}.`);
    }

    const payload: unknown = await response.json();
    const parsed = liveReviewResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Live vision critique returned an invalid review.");
    }

    return { ...parsed.data, provider: "live" };
  },
};

export async function createReview(request: ReviewRequest): Promise<ReviewOutput> {
  return getReviewProvider().createReview(request);
}

export function getReviewProvider() {
  const configuredMode = process.env.IROGUIDE_REVIEW_PROVIDER?.trim().toLowerCase();
  if (configuredMode && LIVE_PROVIDER_MODES.has(configuredMode)) return liveVisionReviewProvider;
  return demoReviewProvider;
}
