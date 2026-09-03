import { randomUUID } from "node:crypto";
import { z } from "zod";
import { critiqueRubricVersion, validateGroundedFindings } from "@/domain/critique-rubrics";
import { categoryLabels, reviewIssueSchema, reviewOutputSchema, type ReviewOutput, type ReviewRequest } from "@/domain/review";
import { commitProviderUsage, getProviderControlStatus, reserveProviderUsage } from "./provider-controls";

const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
const LIVE_PROVIDER_MODES = new Set(["live", "vision", "openrouter"]);
const PROVIDER_DEADLINE_MS = 25_000;

const liveReviewResponseSchema = reviewOutputSchema.omit({
  id: true,
  createdAt: true,
  provider: true,
}).extend({
  id: reviewOutputSchema.shape.id.optional(),
  createdAt: reviewOutputSchema.shape.createdAt.optional(),
  provider: reviewOutputSchema.shape.provider.optional(),
  issues: z.array(reviewIssueSchema.extend({
    rubricId: z.string().min(1),
    evidenceKind: z.enum(["visible", "brief", "visual-risk"]),
    evidenceDescription: z.string().min(1).max(500),
    confidence: z.number().min(0).max(1),
  })).min(1),
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
  name: ReviewOutput["provider"] | "unavailable";
  createReview: (request: ReviewRequest, context?: ProviderExecutionContext) => Promise<ReviewOutput>;
};

type ProviderExecutionContext = { reservationKey: string; userId: string };

const unavailableReviewProvider: ReviewProvider = {
  name: "unavailable",
  createReview: async () => {
    throw new ReviewProviderUnavailableError("Live vision critique is not configured. Please try again later.");
  },
};

const liveVisionReviewProvider: ReviewProvider = {
  name: "live",
  async createReview(request, context) {
    if (!request.image) {
      throw new ReviewProviderUnavailableError("Live vision critique requires uploaded image bytes.");
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new ReviewProviderUnavailableError("Live vision critique is not configured yet.");
    }

    const model = process.env.OPENROUTER_MODEL?.trim() || defaultOpenRouterModel;
    const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL?.trim();
    const deadlineAt = Date.now() + PROVIDER_DEADLINE_MS;
    const jobId = randomUUID();
    const production = process.env.NODE_ENV === "production";
    if (production && !context) throw new ReviewProviderUnavailableError("Live review execution requires an owner-bound reservation.");
    const reservation = production && context ? await reserveProviderUsage(context) : null;
    const startedAt = Date.now();
    let fallbackUsed = false;
    let outcome: "completed" | "failed" | "invalid-output" = "failed";

    try {
      try {
        const review = await createOpenRouterReview(request, apiKey, model, deadlineAt, jobId);
        outcome = "completed";
        return review;
      } catch (error) {
        const fallbackAllowed = !production || getProviderControlStatus().fallbackEnabled;
        if (!(error instanceof ReviewProviderCallError) || !error.retryable || !fallbackAllowed || !fallbackModel || fallbackModel === model) throw error;
        fallbackUsed = true;
        const review = await createOpenRouterReview(request, apiKey, fallbackModel, deadlineAt, jobId);
        outcome = "completed";
        return review;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      outcome = message.includes("invalid review") || message.includes("evidence contract") ? "invalid-output" : "failed";
      throw error;
    } finally {
      if (reservation) await commitProviderUsage(reservation, {
        costMicros: null,
        fallbackUsed,
        latencyMs: Date.now() - startedAt,
        outcome,
      });
    }
  },
};

async function createOpenRouterReview(
  request: ReviewRequest,
  apiKey: string,
  model: string,
  deadlineAt: number,
  jobId: string,
): Promise<ReviewOutput> {
  if (!request.image) {
    throw new ReviewProviderUnavailableError("Live vision critique requires uploaded image bytes.");
  }

  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw new ReviewProviderCallError("Live vision critique exceeded its deadline.", false);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), remainingMs);
  let response: Response;
  try {
    response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: { ...getOpenRouterHeaders(apiKey), "X-IroGuide-Review-Job": jobId },
      body: JSON.stringify(getOpenRouterRequestBody(request, model)),
      redirect: "error",
      signal: controller.signal,
    });
  } catch {
    const timedOut = controller.signal.aborted;
    throw new ReviewProviderCallError(
      timedOut ? "Live vision critique exceeded its deadline." : "Live vision critique could not reach its provider.",
      !timedOut,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ReviewProviderCallError(
      `Live vision critique failed with status ${response.status}.`,
      response.status === 408 || response.status === 429 || response.status >= 500,
    );
  }

  const payload: unknown = await response.json();
  const parsedPayload = openRouterResponseSchema.parse(payload) as OpenRouterChoicePayload;
  const content = parsedPayload.choices?.[0]?.message?.content;
  return normalizeProviderReviewOutput(parseProviderJson(content), request.category);
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
          "{ overallScore:number, summary:string, strengths:string[], scores:{label:string,score:number}[], rubricVersion:string, issues:{id?:string,rubricId:string,category:string,score:number,priority:'high'|'medium'|'low',observation:string,evidenceKind:'visible'|'brief'|'visual-risk',evidenceDescription:string,impact:string,recommendation:string,actions:string[],confidence:number}[], annotations:{id:string,issueId:string,label:string,description:string,x:number,y:number,width:number,height:number,confidence:number}[], checklist:{label:string,priority:'high'|'medium'|'low'}[], followUps:string[] }",
          "Use normalized annotation coordinates from 0 to 1 relative to the full uploaded image pixel area.",
          "For every annotation, x and y are the top-left corner of a tight bounding box; width and height are the box size.",
          "Place each box directly over the visible evidence for that issue, never over empty margins or unrelated artwork.",
          "Use specific annotation labels tied to the visible fault, and omit an annotation when the issue cannot be localized visually.",
          "Every annotation must map to an issueId.",
          "Ground observations in visible evidence from the image and the stated audience, purpose, style, and goal.",
          `For UI/UX screens and websites, set rubricVersion to ${critiqueRubricVersion}. For UI/UX screens use UI-TASK-CLARITY-001, UI-INFORMATION-HIERARCHY-001, UI-INTERACTION-AFFORDANCE-001, UI-SYSTEM-CONSISTENCY-001, or UI-VISUAL-ACCESSIBILITY-001. For websites use WEB-HERO-CLARITY-001, WEB-NAVIGATION-001, WEB-CONVERSION-PATH-001, WEB-TRUST-001, or WEB-VISUAL-ACCESSIBILITY-001.`,
          "Accessibility observations from an image are visual risks only: never claim WCAG conformance, keyboard behavior, screen-reader behavior, semantic HTML, focus behavior, or responsive runtime behavior.",
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

export function prepareLiveReviewPayload(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.issues)) return payload;

  return {
    ...payload,
    issues: payload.issues.map((issue, index) => isRecord(issue) && !getNonEmptyString(issue.id)
      ? { ...issue, id: `issue-${index + 1}` }
      : issue),
  };
}

class ReviewProviderCallError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = "ReviewProviderCallError";
  }
}

function getNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLiveReview(
  payload: LiveReviewPayload,
  idFactory: () => string = randomUUID,
  now: () => Date = () => new Date(),
): ReviewOutput {
  return {
    ...payload,
    id: payload.id ?? `live-${idFactory()}`,
    createdAt: payload.createdAt ?? now().toISOString(),
    provider: "live",
  };
}

export function normalizeProviderReviewOutput(
  payload: unknown,
  category: ReviewRequest["category"],
  dependencies: { idFactory?: () => string; now?: () => Date } = {},
) {
  const parsedReview = liveReviewResponseSchema.safeParse(prepareLiveReviewPayload(payload));
  if (!parsedReview.success) throw new Error("Live vision critique returned an invalid review.");
  if (category === "ui" || category === "website") {
    const validationErrors = validateGroundedFindings(category, parsedReview.data.issues);
    if (validationErrors.length > 0) {
      throw new Error(`Live vision critique violated the evidence contract: ${validationErrors.join(" ")}`);
    }
  }
  return normalizeLiveReview(parsedReview.data, dependencies.idFactory, dependencies.now);
}

const endpointReviewProvider: ReviewProvider = {
  name: "live",
  async createReview(request) {
    const endpoint = getValidatedReviewEndpoint(process.env.IROGUIDE_VISION_REVIEW_ENDPOINT);
    if (!endpoint) {
      throw new ReviewProviderUnavailableError("Live vision critique endpoint is not configured.");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      redirect: "error",
      signal: AbortSignal.timeout(PROVIDER_DEADLINE_MS),
    });

    if (!response.ok) {
      throw new Error(`Live vision critique failed with status ${response.status}.`);
    }

    const payload: unknown = await response.json();
    return normalizeProviderReviewOutput(payload, request.category);
  },
};

function getValidatedReviewEndpoint(value: string | undefined) {
  const rawEndpoint = value?.trim();
  if (!rawEndpoint) return null;

  let endpoint: URL;
  try {
    endpoint = new URL(rawEndpoint);
  } catch {
    throw new ReviewProviderUnavailableError("Live vision critique endpoint is invalid.");
  }

  if (endpoint.protocol !== "https:") {
    throw new ReviewProviderUnavailableError("Live vision critique endpoint must use HTTPS.");
  }

  if (isBlockedOutboundHost(endpoint.hostname)) {
    throw new ReviewProviderUnavailableError("Live vision critique endpoint host is not allowed.");
  }

  const allowedHosts = new Set((process.env.IROGUIDE_VISION_REVIEW_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean));
  if (!allowedHosts.has(endpoint.hostname.toLowerCase())) {
    throw new ReviewProviderUnavailableError("Live vision critique endpoint host is not allowlisted.");
  }

  endpoint.username = "";
  endpoint.password = "";
  endpoint.hash = "";
  return endpoint.toString();
}

function isBlockedOutboundHost(hostname: string) {
  const host = hostname.trim().toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host === "::" || host === "::1") return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [first, second] = octets;

  return first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

export async function createReview(request: ReviewRequest, context?: ProviderExecutionContext): Promise<ReviewOutput> {
  return getReviewProvider().createReview(request, context);
}

export function getReviewProvider() {
  const configuredMode = process.env.IROGUIDE_REVIEW_PROVIDER?.trim().toLowerCase();
  const production = process.env.NODE_ENV === "production";
  const controls = getProviderControlStatus();

  if (configuredMode === "demo") return unavailableReviewProvider;
  if (configuredMode === "endpoint") return production ? unavailableReviewProvider : endpointReviewProvider;
  if (configuredMode && LIVE_PROVIDER_MODES.has(configuredMode)) return production && !controls.enabled ? unavailableReviewProvider : liveVisionReviewProvider;
  if (process.env.OPENROUTER_API_KEY?.trim()) return production && !controls.enabled ? unavailableReviewProvider : liveVisionReviewProvider;
  return unavailableReviewProvider;
}

export function getReviewProviderStatus() {
  const configuredMode = process.env.IROGUIDE_REVIEW_PROVIDER?.trim().toLowerCase() || "auto";
  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const endpointConfigured = Boolean(process.env.IROGUIDE_VISION_REVIEW_ENDPOINT?.trim());
  const activeProvider = getReviewProvider().name;
  const controls = getProviderControlStatus();
  let endpointReady = false;
  if (process.env.NODE_ENV !== "production" && endpointConfigured) {
    try {
      endpointReady = Boolean(getValidatedReviewEndpoint(process.env.IROGUIDE_VISION_REVIEW_ENDPOINT));
    } catch {
      endpointReady = false;
    }
  }
  const liveReady = activeProvider === "live" && (openRouterConfigured || endpointReady) && (!productionMode() || controls.enabled);

  return {
    activeProvider,
    configuredMode,
    endpointConfigured,
    liveReady,
    openRouterConfigured,
    controlsReady: controls.ready,
  };
}

function productionMode() {
  return process.env.NODE_ENV === "production";
}
