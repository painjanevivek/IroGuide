import { NextResponse } from "next/server";
import { createPublicRequestContext, enforceRateLimit } from "@/server/api-security";
import { getFirebaseAdminProjectId, isFirebaseAdminConfigured } from "@/server/firebase-admin";
import { jsonHeaders, logRequestEvent } from "@/server/observability";
import { getReviewProviderStatus } from "@/server/review-provider";

const READINESS_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export function GET(request: Request) {
  const context = createPublicRequestContext(request, "api.readiness.get");
  const rateLimit = enforceRateLimit({
    context,
    eventPrefix: "readiness",
    key: "readiness",
    message: "Too many readiness checks. Please try again shortly.",
    request,
    ...READINESS_RATE_LIMIT,
  });
  if ("response" in rateLimit) return rateLimit.response;

  const reviewProvider = getReviewProviderStatus();
  const accountStorageProjectId = getFirebaseAdminProjectId();
  const publicFirebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || null;
  const checks = {
    accountStorage: isFirebaseAdminConfigured(),
    firebaseProjectMatch: Boolean(accountStorageProjectId && publicFirebaseProjectId && accountStorageProjectId === publicFirebaseProjectId),
    liveVision: reviewProvider.liveReady,
  };
  const ready = checks.accountStorage && checks.firebaseProjectMatch && checks.liveVision;
  logRequestEvent("info", "readiness.checked", context, {
    ready,
    liveVision: checks.liveVision,
  });

  return NextResponse.json({
    ok: ready,
    checks,
    reviewProvider,
  }, { status: ready ? 200 : 503, headers: jsonHeaders(context, getRateHeaders(rateLimit)) });
}

function getRateHeaders(rateLimit: ReturnType<typeof enforceRateLimit>): HeadersInit {
  return "result" in rateLimit ? {
    "X-RateLimit-Limit": String(rateLimit.result.limit),
    "X-RateLimit-Remaining": String(rateLimit.result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateLimit.result.resetAt / 1000)),
  } : {};
}
