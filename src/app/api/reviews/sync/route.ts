import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { storedReviewDocumentSchema } from "@/domain/review-storage";
import { FirebaseAdminUnavailableError, FirebaseTokenVerificationError, verifyFirebaseIdToken } from "@/server/firebase-admin";
import { createRequestContext, getClientKey, jsonHeaders, logRequestEvent } from "@/server/observability";
import { checkRateLimit, getRateLimitHeaders } from "@/server/rate-limit";
import { syncReviewDocumentsForUser } from "@/server/review-storage";

const syncRequestSchema = z.object({
  documents: z.array(storedReviewDocumentSchema).max(30),
});
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
    const body: unknown = await request.json();
    const parsed = syncRequestSchema.parse(body);
    const result = await syncReviewDocumentsForUser(decodedToken.uid, parsed.documents);
    logRequestEvent("info", "review_sync.completed", context, {
      failed: result.failedIds.length,
      requested: parsed.documents.length,
      saved: result.savedIds.length,
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
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Review sync details are incomplete or invalid.", details: error.flatten() }, { status: 400, headers: jsonHeaders(context) });
    }

    logRequestEvent("error", "review_sync.failed", context);
    return NextResponse.json({ error: "Review sync failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}

function getAuthDiagnosticHeaders(error: FirebaseTokenVerificationError): HeadersInit {
  return error.code ? { "x-iroguide-auth-error": error.code } : {};
}
