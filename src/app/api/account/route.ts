import { NextResponse } from "next/server";
import { deleteFirebaseUser, FirebaseAdminUnavailableError, FirebaseTokenVerificationError, verifyFirebaseIdToken } from "@/server/firebase-admin";
import { createRequestContext, getClientKey, jsonHeaders, logRequestEvent } from "@/server/observability";
import { checkRateLimit, getRateLimitHeaders } from "@/server/rate-limit";
import { deleteReviewDataForUser } from "@/server/review-storage";

const ACCOUNT_DELETE_RATE_LIMIT = { limit: 4, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const context = createRequestContext(request, "api.account.delete");
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    logRequestEvent("warn", "account_delete.auth_missing", context);
    return NextResponse.json({ error: "Sign in again before deleting your account." }, { status: 401, headers: jsonHeaders(context) });
  }

  try {
    const decodedToken = await verifyFirebaseIdToken(authorization.slice("Bearer ".length).trim());
    const rateLimit = checkRateLimit({
      key: `account-delete:${decodedToken.uid}:${getClientKey(request, "unknown")}`,
      ...ACCOUNT_DELETE_RATE_LIMIT,
    });
    if (!rateLimit.allowed) {
      logRequestEvent("warn", "account_delete.rate_limited", context, { uid: decodedToken.uid });
      return NextResponse.json(
        { error: "Too many account deletion requests. Please try again shortly." },
        { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) },
      );
    }

    const result = await deleteReviewDataForUser(decodedToken.uid);
    await deleteFirebaseUser(decodedToken.uid);
    logRequestEvent("info", "account_delete.completed", context, {
      draftsDeleted: result.draftsDeleted,
      reviewsDeleted: result.reviewsDeleted,
      sourceImagesDeleted: result.sourceImagesDeleted,
      uid: decodedToken.uid,
    });

    return NextResponse.json({ deleted: true, ...result }, { headers: jsonHeaders(context, getRateLimitHeaders(rateLimit)) });
  } catch (error) {
    if (error instanceof FirebaseAdminUnavailableError) {
      logRequestEvent("error", "account_delete.admin_unavailable", context);
      return NextResponse.json({ error: error.message }, { status: 503, headers: jsonHeaders(context) });
    }
    if (error instanceof FirebaseTokenVerificationError) {
      logRequestEvent("warn", "account_delete.auth_invalid", context);
      return NextResponse.json({ error: error.message }, { status: 401, headers: jsonHeaders(context, getAuthDiagnosticHeaders(error)) });
    }

    logRequestEvent("error", "account_delete.failed", context);
    return NextResponse.json({ error: "Account deletion failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}

function getAuthDiagnosticHeaders(error: FirebaseTokenVerificationError): HeadersInit {
  return {
    ...(error.code ? { "x-iroguide-auth-error": error.code } : {}),
    ...(error.detail ? { "x-iroguide-auth-detail": error.detail } : {}),
  };
}
