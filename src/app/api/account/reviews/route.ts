import { NextResponse } from "next/server";
import { enforceSameOriginRequest } from "@/server/api-security";
import { FirebaseAdminUnavailableError, FirebaseTokenVerificationError, verifyFirebaseIdToken } from "@/server/firebase-admin";
import { createRequestContext, getClientKey, jsonHeaders, logRequestEvent, toLogSafeUserId } from "@/server/observability";
import { checkRateLimit, getRateLimitHeaders } from "@/server/rate-limit";
import { deleteReviewDataForUser } from "@/server/review-storage";

const REVIEW_PURGE_RATE_LIMIT = { limit: 6, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const context = createRequestContext(request, "api.account.reviews.delete");
  const originCheck = enforceSameOriginRequest(request, context, "account_reviews_delete");
  if ("response" in originCheck) return originCheck.response;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    logRequestEvent("warn", "account_reviews_delete.auth_missing", context);
    return NextResponse.json({ error: "Sign in again before deleting review history." }, { status: 401, headers: jsonHeaders(context) });
  }

  try {
    const decodedToken = await verifyFirebaseIdToken(authorization.slice("Bearer ".length).trim());
    const rateLimit = checkRateLimit({
      key: `account-reviews-delete:${decodedToken.uid}:${getClientKey(request, "unknown")}`,
      ...REVIEW_PURGE_RATE_LIMIT,
    });
    if (!rateLimit.allowed) {
      logRequestEvent("warn", "account_reviews_delete.rate_limited", context, { user: toLogSafeUserId(decodedToken.uid) });
      return NextResponse.json(
        { error: "Too many deletion requests. Please try again shortly." },
        { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) },
      );
    }

    const result = await deleteReviewDataForUser(decodedToken.uid);
    logRequestEvent("info", "account_reviews_delete.completed", context, {
      draftsDeleted: result.draftsDeleted,
      reviewsDeleted: result.reviewsDeleted,
      sourceImagesDeleted: result.sourceImagesDeleted,
      user: toLogSafeUserId(decodedToken.uid),
    });

    return NextResponse.json({ deleted: true, ...result }, { headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) });
  } catch (error) {
    if (error instanceof FirebaseAdminUnavailableError) {
      logRequestEvent("error", "account_reviews_delete.admin_unavailable", context);
      return NextResponse.json({ error: error.message }, { status: 503, headers: jsonHeaders(context) });
    }
    if (error instanceof FirebaseTokenVerificationError) {
      logRequestEvent("warn", "account_reviews_delete.auth_invalid", context);
      return NextResponse.json({ error: error.message }, { status: 401, headers: jsonHeaders(context, getAuthDiagnosticHeaders(error)) });
    }

    logRequestEvent("error", "account_reviews_delete.failed", context);
    return NextResponse.json({ error: "Review history deletion failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}

function getAuthDiagnosticHeaders(error: FirebaseTokenVerificationError): HeadersInit {
  return {
    ...(error.code ? { "x-iroguide-auth-error": error.code } : {}),
  };
}
