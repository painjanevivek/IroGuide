import { afterEach, describe, expect, it, vi } from "vitest";
import { createReview, getReviewProvider, getReviewProviderStatus, ReviewProviderUnavailableError } from "./review-provider";
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

const requestWithImage: ReviewRequest = {
  ...request,
  image: {
    mimeType: "image/png",
    dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
  },
};

const liveReviewPayload = {
  overallScore: 8.1,
  summary: "The logo has a clear visual anchor, but the supporting spacing needs refinement.",
  strengths: ["The mark has a recognizable silhouette."],
  scores: [
    { label: "Memorability", score: 8 },
    { label: "Craft", score: 7.5 },
  ],
  rubricVersion: "test-rubric",
  issues: [
    {
      id: "spacing",
      category: "Craft",
      score: 7.5,
      priority: "medium",
      observation: "The pixel spacing around the mark is uneven.",
      impact: "Uneven spacing makes the identity feel less deliberate.",
      recommendation: "Normalize the clear space around the mark.",
      actions: ["Set a consistent clear-space unit."],
    },
  ],
  annotations: [
    {
      id: "annotation-spacing",
      issueId: "spacing",
      label: "Spacing",
      description: "This area shows uneven clear space.",
      x: 0.2,
      y: 0.2,
      width: 0.3,
      height: 0.3,
      confidence: 0.82,
    },
  ],
  checklist: [{ label: "Normalize logo clear space.", priority: "medium" }],
  followUps: ["How much spacing should I use?"],
};

describe("review provider routing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the deterministic review provider by default", async () => {
    const review = await createReview(request);

    expect(getReviewProvider().name).toBe("demo");
    expect(review.provider).toBe("demo");
  });

  it("uses the deterministic review provider in production when live credentials are not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IROGUIDE_REVIEW_PROVIDER", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");

    const review = await createReview(requestWithImage);

    expect(getReviewProvider().name).toBe("demo");
    expect(review.provider).toBe("demo");
  });

  it("fails clearly when live vision mode is enabled without OpenRouter credentials", async () => {
    vi.stubEnv("IROGUIDE_REVIEW_PROVIDER", "live");
    vi.stubEnv("OPENROUTER_API_KEY", "");

    await expect(createReview(requestWithImage)).rejects.toBeInstanceOf(ReviewProviderUnavailableError);
  });

  it("reports live readiness without exposing credentials", () => {
    vi.stubEnv("IROGUIDE_REVIEW_PROVIDER", "live");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_MODEL", "test/vision-model");

    expect(getReviewProviderStatus()).toEqual(expect.objectContaining({
      activeProvider: "live",
      configuredMode: "live",
      liveReady: true,
      openRouterConfigured: true,
      openRouterModel: "test/vision-model",
    }));
  });

  it("requires image bytes for live vision critique", async () => {
    vi.stubEnv("IROGUIDE_REVIEW_PROVIDER", "live");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");

    await expect(createReview(request)).rejects.toBeInstanceOf(ReviewProviderUnavailableError);
  });

  it("sends uploaded image pixels to the configured OpenRouter vision model", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(liveReviewPayload) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubEnv("IROGUIDE_REVIEW_PROVIDER", "live");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_MODEL", "test/vision-model");
    vi.stubGlobal("fetch", fetchMock);

    const review = await createReview(requestWithImage);
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(requestInit.body)) as {
      model: string;
      messages: Array<{ content: string | Array<{ type: string; image_url?: { url: string } }> }>;
    };
    const userContent = body.messages[1]?.content;
    const imagePart = Array.isArray(userContent) ? userContent.find((part) => part.type === "image_url") : undefined;

    expect(review.provider).toBe("live");
    expect(body.model).toBe("test/vision-model");
    expect(imagePart?.image_url?.url).toBe(`data:image/png;base64,${requestWithImage.image?.dataBase64}`);
  });
});
