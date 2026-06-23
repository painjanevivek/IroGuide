import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { z, ZodError } from "zod";
import { storedReviewDocumentSchema } from "@/domain/review-storage";
import { reviewFileSchema, reviewImageSchema } from "@/domain/review";
import { FirebaseAdminUnavailableError, FirebaseTokenVerificationError, verifyFirebaseIdToken } from "@/server/firebase-admin";
import { createRequestContext, getClientKey, jsonHeaders, logRequestEvent } from "@/server/observability";
import { checkRateLimit, getRateLimitHeaders } from "@/server/rate-limit";
import { syncReviewDocumentsForUser } from "@/server/review-storage";

const syncRequestSchema = z.object({
  documents: z.array(storedReviewDocumentSchema).max(30),
});
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SYNC_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.reviews.sync");
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    logRequestEvent("warn", "review_sync.auth_missing", context);
    return NextResponse.json({ error: "Sign in again before syncing reviews." }, { status: 401, headers: jsonHeaders(context) });
  }

  try {
    const decodedToken = await verifyFirebaseIdToken(authorization.slice("Bearer ".length).trim());
    const rateLimit = checkRateLimit({
      key: `review-sync:${decodedToken.uid}:${getClientKey(request, "unknown")}`,
      ...SYNC_RATE_LIMIT,
    });
    if (!rateLimit.allowed) {
      logRequestEvent("warn", "review_sync.rate_limited", context, { uid: decodedToken.uid });
      return NextResponse.json(
        { error: "Too many sync requests. Please try again shortly." },
        { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) },
      );
    }
    const parsed = await parseSyncRequest(request);
    const result = await syncReviewDocumentsForUser(decodedToken.uid, parsed.documents);
    logRequestEvent("info", "review_sync.completed", context, {
      failed: result.failedIds.length,
      requested: parsed.documents.length,
      saved: result.savedIds.length,
      sourceImages: result.sourceImages.length,
      uid: decodedToken.uid,
    });

    return NextResponse.json(result, { headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) });
  } catch (error) {
    if (error instanceof FirebaseAdminUnavailableError) {
      logRequestEvent("error", "review_sync.admin_unavailable", context);
      return NextResponse.json({ error: error.message }, { status: 503, headers: jsonHeaders(context) });
    }
    if (error instanceof FirebaseTokenVerificationError) {
      logRequestEvent("warn", "review_sync.auth_invalid", context);
      return NextResponse.json({ error: error.message }, { status: 401, headers: jsonHeaders(context, getAuthDiagnosticHeaders(error)) });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ReviewSyncValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Review sync details are incomplete or invalid.", details: error.flatten() }, { status: 400, headers: jsonHeaders(context) });
    }

    logRequestEvent("error", "review_sync.failed", context);
    return NextResponse.json({ error: "Review sync failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}

async function parseSyncRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    const body: unknown = await request.json();
    return {
      documents: syncRequestSchema.parse(body).documents,
    };
  }

  const formData = await request.formData();
  const documentValue = formData.get("document");
  if (typeof documentValue !== "string") {
    throw new ReviewSyncValidationError("Review sync details are incomplete or invalid.");
  }

  const document = storedReviewDocumentSchema.parse(JSON.parse(documentValue) as unknown);
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return { documents: [document] };
  }
  const sourceImage = await parseSourceImageUpload(image);

  return {
    documents: [{ document, sourceImage }],
  };
}

async function parseSourceImageUpload(image: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(image.type)) {
    throw new ReviewSyncValidationError("Choose a PNG, JPEG, or WebP image.");
  }
  if (image.size <= 0 || image.size > MAX_IMAGE_SIZE) {
    throw new ReviewSyncValidationError("Use an image between 1 byte and 10 MB.");
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!hasMatchingImageSignature(bytes, image.type)) {
    throw new ReviewSyncValidationError("The uploaded file does not match its image type.");
  }
  const dataBase64 = Buffer.from(bytes).toString("base64");

  return {
    file: reviewFileSchema.parse({ name: image.name, type: image.type, size: image.size }),
    image: reviewImageSchema.parse({
      mimeType: image.type,
      dataBase64,
    }),
  };
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

class ReviewSyncValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewSyncValidationError";
  }
}

function getAuthDiagnosticHeaders(error: FirebaseTokenVerificationError): HeadersInit {
  return {
    ...(error.code ? { "x-iroguide-auth-error": error.code } : {}),
    ...(error.detail ? { "x-iroguide-auth-detail": error.detail } : {}),
  };
}
