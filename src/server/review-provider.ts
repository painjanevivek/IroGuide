import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createDemoReview } from "@/domain/demo-review";
import { categoryLabels, reviewOutputSchema, type ReviewOutput, type ReviewRequest } from "@/domain/review";

const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
const LIVE_PROVIDER_MODES = new Set(["live", "vision", "openrouter"]);

const liveReviewResponseSchema = reviewOutputSchema.omit({
  id: true,
  createdAt: true,
  provider: true,
}).extend({
  id: reviewOutputSchema.shape.id.optional(),
  createdAt: reviewOutputSchema.shape.createdAt.optional(),
  provider: reviewOutputSchema.shape.provider.optional(),
});

const openRouterResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.unknown().optional(),
    }).optional(),
  })).optional(),
}).passthrough();

const defaultOpenRouterModel = "qwen/qwen3.5-vl";

type LiveReviewPayload = Omit<ReviewOutput, "id" | "createdAt" | "provider"> & {
  id?: string;
  createdAt?: string;
  provider?: ReviewOutput["provider"];
};

type OpenRouterMessageContent = Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
>;

type OpenRouterRequestBody = {
  model: string;
  temperature: number;
  response_format: { type: "json_object" };
  messages: Array<{
    role: "system" | "user";
    content: string | OpenRouterMessageContent;
  }>;
};

type OpenRouterChoicePayload = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

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
    if (!request.image) {
      throw new ReviewProviderUnavailableError("Live vision critique requires uploaded image bytes.");
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new ReviewProviderUnavailableError("Live vision critique is not configured yet.");
    }

    const model = process.env.OPENROUTER_MODEL?.trim() || defaultOpenRouterModel;
    const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL?.trim();

    try {
      return await createOpenRouterReview(request, apiKey, model);
    } catch (error) {
      if (!fallbackModel || fallbackModel === model) throw error;
      return createOpenRouterReview(request, apiKey, fallbackModel);
    }
  },
};

async function createOpenRouterReview(request: ReviewRequest, apiKey: string, model: string): Promise<ReviewOutput> {
  if (!request.image) {
    throw new ReviewProviderUnavailableError("Live vision critique requires uploaded image bytes.");
  }

  const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: getOpenRouterHeaders(apiKey),
    body: JSON.stringify(getOpenRouterRequestBody(request, model)),
  });

  if (!response.ok) {
    throw new Error(`Live vision critique failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  const parsedPayload = openRouterResponseSchema.parse(payload) as OpenRouterChoicePayload;
  const content = parsedPayload.choices?.[0]?.message?.content;
  const parsedReview = liveReviewResponseSchema.safeParse(parseProviderJson(content));
  if (!parsedReview.success) {
    throw new Error("Live vision critique returned an invalid review.");
  }

  return normalizeLiveReview(parsedReview.data);
}

function getOpenRouterHeaders(apiKey: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const siteUrl = process.env.OPENROUTER_SITE_URL?.trim();
  const appName = process.env.OPENROUTER_APP_NAME?.trim() || "IroGuide";

  if (siteUrl) headers["HTTP-Referer"] = siteUrl;
  if (appName) headers["X-Title"] = appName;

  return headers;
}

function getOpenRouterRequestBody(request: ReviewRequest, model: string): OpenRouterRequestBody {
  if (!request.image) {
    throw new ReviewProviderUnavailableError("Live vision critique requires uploaded image bytes.");
  }

  return {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are IroGuide, a senior visual design critic.",
          "Analyze the actual uploaded image pixels together with the user's brief.",
          "Return only valid JSON. Do not wrap the response in markdown.",
          "The JSON must match this TypeScript shape:",
          "{ overallScore:number, summary:string, strengths:string[], scores:{label:string,score:number}[], rubricVersion:string, issues:{id?:string,category:string,score:number,priority:'high'|'medium'|'low',observation:string,impact:string,recommendation:string,actions:string[]}[], annotations:{id:string,issueId:string,label:string,description:string,x:number,y:number,width:number,height:number,confidence:number}[], checklist:{label:string,priority:'high'|'medium'|'low'}[], followUps:string[] }",
          "Use normalized annotation coordinates from 0 to 1. Every annotation must map to an issueId.",
          "Ground observations in visible evidence from the image and the stated audience, purpose, style, and goal.",
          "Do not infer sensitive traits, authorship, culture, or intent from the image.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: getReviewPrompt(request),
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${request.image.mimeType};base64,${request.image.dataBase64}`,
            },
          },
        ],
      },
    ],
  };
}

function getReviewPrompt(request: ReviewRequest) {
  return [
    `Category: ${categoryLabels[request.category]}.`,
    `Feedback mode: ${request.mode}.`,
    `Target audience: ${request.brief.audience}.`,
    `Purpose: ${request.brief.purpose}.`,
    `Style direction: ${request.brief.style}.`,
    `Primary goal: ${request.brief.goal}.`,
    request.brief.concern ? `Specific concern: ${request.brief.concern}.` : "",
    "Give a production-quality critique that identifies what is visibly working, what is failing, why it matters, and how to improve it.",
    "Prioritize the highest-impact fix first. Include 3 to 6 score dimensions and 3 to 5 issues.",
  ].filter(Boolean).join("\n");
}

function parseProviderJson(content: unknown) {
  if (typeof content !== "string") {
    throw new Error("Live vision critique returned empty content.");
  }

  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as unknown;

  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedJson?.[1]) return JSON.parse(fencedJson[1]) as unknown;

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown;
  }

  throw new Error("Live vision critique returned non-JSON content.");
}

function normalizeLiveReview(payload: LiveReviewPayload): ReviewOutput {
  return {
    ...payload,
    id: payload.id ?? `live-${randomUUID()}`,
    createdAt: payload.createdAt ?? new Date().toISOString(),
    provider: "live",
  };
}

const endpointReviewProvider: ReviewProvider = {
  name: "live",
  async createReview(request) {
    const endpoint = process.env.IROGUIDE_VISION_REVIEW_ENDPOINT?.trim();
    if (!endpoint) {
      throw new ReviewProviderUnavailableError("Live vision critique endpoint is not configured.");
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

    return normalizeLiveReview(parsed.data);
  },
};

export async function createReview(request: ReviewRequest): Promise<ReviewOutput> {
  return getReviewProvider().createReview(request);
}

export function getReviewProvider() {
  const configuredMode = process.env.IROGUIDE_REVIEW_PROVIDER?.trim().toLowerCase();
  if (configuredMode === "demo") return demoReviewProvider;
  if (configuredMode === "endpoint") return endpointReviewProvider;
  if (configuredMode && LIVE_PROVIDER_MODES.has(configuredMode)) return liveVisionReviewProvider;
  if (process.env.OPENROUTER_API_KEY?.trim()) return liveVisionReviewProvider;
  if (process.env.NODE_ENV === "production") return liveVisionReviewProvider;
  return demoReviewProvider;
}
