import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { reviewRequestSchema } from "@/domain/review";
import { enforceSameOriginRequest, requireContentType } from "@/server/api-security";
import { FirebaseAdminUnavailableError, FirebaseTokenVerificationError, verifyFirebaseIdToken } from "@/server/firebase-admin";
import { createRequestContext, getClientKey, jsonHeaders, logRequestEvent, toLogSafeUserId } from "@/server/observability";
import { checkRateLimit, getRateLimitHeaders } from "@/server/rate-limit";
import { createReview, ReviewProviderUnavailableError } from "@/server/review-provider";
import { saveReviewForUser } from "@/server/review-storage";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const REVIEW_RATE_LIMIT = { limit: 12, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.reviews.create");
  const originCheck = enforceSameOriginRequest(request, context, "review");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "review", ["application/json", "multipart/form-data"]);
  if ("response" in contentTypeCheck) return contentTypeCheck.response;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    logRequestEvent("warn", "review.auth_missing", context);
    return NextResponse.json({ error: "Sign in again before starting a critique." }, { status: 401, headers: jsonHeaders(context) });
  }

  try {
    const decodedToken = await verifyFirebaseIdToken(authorization.slice("Bearer ".length).trim());
    const rateLimit = checkRateLimit({
      key: `review:${decodedToken.uid}:${getClientKey(request, "unknown")}`,
      ...REVIEW_RATE_LIMIT,
    });
    if (!rateLimit.allowed) {
      logRequestEvent("warn", "review.rate_limited", context, { user: toLogSafeUserId(decodedToken.uid) });
      return NextResponse.json(
        { error: "Too many review requests. Please try again shortly." },
        { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) },
      );
    }
    const parsed = await parseReviewRequest(request);
    const review = await createReview(parsed);
    const persistence = await saveReviewToAccount(decodedToken.uid, review, parsed);
    logRequestEvent("info", "review.created", context, {
      category: parsed.category,
      provider: review.provider,
      savedToAccount: persistence.savedToAccount,
      imageSavedToAccount: persistence.imageSavedToAccount,
      user: toLogSafeUserId(decodedToken.uid),
    });

    return NextResponse.json({
      review,
      persistence,
    }, { headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) });
  } catch (error) {
    if (error instanceof FirebaseAdminUnavailableError) {
      logRequestEvent("error", "review.admin_unavailable", context);
      return NextResponse.json({ error: error.message }, { status: 503, headers: jsonHeaders(context) });
    }
    if (error instanceof FirebaseTokenVerificationError) {
      logRequestEvent("warn", "review.auth_invalid", context);
      return NextResponse.json({ error: error.message }, { status: 401, headers: jsonHeaders(context, getAuthDiagnosticHeaders(error)) });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ReviewRequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: getReviewValidationMessage(error) }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ReviewProviderUnavailableError) {
      logRequestEvent("error", "review.provider_unavailable", context);
      return NextResponse.json({ error: error.message }, { status: 503, headers: jsonHeaders(context) });
    }
    logRequestEvent("error", "review.failed", context);
    return NextResponse.json({ error: "Review failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}

function getAuthDiagnosticHeaders(error: FirebaseTokenVerificationError): HeadersInit {
  return {
    ...(error.code ? { "x-iroguide-auth-error": error.code } : {}),
  };
}

async function saveReviewToAccount(userId: string, review: Awaited<ReturnType<typeof createReview>>, parsed: Awaited<ReturnType<typeof parseReviewRequest>>) {
  try {
    const document = await saveReviewForUser({
      userId,
      review,
      category: parsed.category,
      sourceImage: parsed.image ? { file: parsed.file, image: parsed.image } : undefined,
    });
    return {
      savedToAccount: true,
      imageSavedToAccount: Boolean(document.sourceImage),
      ...(document.sourceImage ? { sourceImage: document.sourceImage } : {}),
    };
  } catch {
    return { savedToAccount: false, imageSavedToAccount: false };
  }
}

async function parseReviewRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return parseMultipartReviewRequest(request);
  }

  const body: unknown = await request.json();
  return reviewRequestSchema.parse(body);
}

async function parseMultipartReviewRequest(request: Request) {
  const formData = await request.formData();
  const category = getRequiredString(formData, "category");
  const mode = getRequiredString(formData, "mode");
  const brief = parseBrief(getRequiredString(formData, "brief"));
  const image = formData.get("image");

  if (!(image instanceof File)) {
    throw new ReviewRequestValidationError("Choose a PNG, JPEG, or WebP image before starting a critique.");
  }
  if (!ACCEPTED_IMAGE_TYPES.has(image.type)) {
    throw new ReviewRequestValidationError("Choose a PNG, JPEG, or WebP image.");
  }
  if (image.size <= 0 || image.size > MAX_IMAGE_SIZE) {
    throw new ReviewRequestValidationError("Use an image between 1 byte and 10 MB.");
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!hasMatchingImageSignature(bytes, image.type)) {
    throw new ReviewRequestValidationError("The uploaded file does not match its image type.");
  }

  return reviewRequestSchema.parse({
    category,
    mode,
    file: { name: image.name, type: image.type, size: image.size },
    brief,
    image: {
      mimeType: image.type,
      dataBase64: Buffer.from(bytes).toString("base64"),
    },
  });
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ReviewRequestValidationError("Review details are incomplete or invalid.");
  }

  return value;
}

function parseBrief(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new ReviewRequestValidationError("Review brief must be valid JSON.");
  }
}

function hasMatchingImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mimeType === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }

  return false;
}

class ReviewRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewRequestValidationError";
  }
}

function getReviewValidationMessage(error: ZodError) {
  const firstIssue = error.issues[0];
  const field = firstIssue?.path.join(".");

  if (field === "brief.audience") return "Target audience must be at least 3 characters.";
  if (field === "brief.purpose") return "Purpose must be at least 3 characters.";
  if (field === "brief.style") return "Style direction must be at least 2 characters.";
  if (field === "brief.goal") return "Primary goal must be at least 3 characters.";
  if (field === "brief.concern") return "Specific concern is too long.";
  if (field === "category") return "Choose a valid design category.";
  if (field === "mode") return "Choose a valid feedback mode.";
  if (field?.startsWith("file")) return "Choose a valid PNG, JPEG, or WebP image before starting a critique.";

  return "Review details are incomplete or invalid.";
}
