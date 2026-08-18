import { NextResponse } from "next/server";
import { createPublicRequestContext, enforceRateLimit } from "@/server/api-security";
import { isBugReportEmailConfigured } from "@/server/bug-report-email";
import { getFirebaseAdminProjectId, isFirebaseAdminConfigured, isFirebaseAdminStorageConfigured } from "@/server/firebase-admin";
import { getServerLaunchCapabilities } from "@/server/launch-capabilities";
import { jsonHeaders, logRequestEvent } from "@/server/observability";
import { buildReadiness } from "@/server/readiness";
import { getReviewProviderStatus } from "@/server/review-provider";

const READINESS_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = createPublicRequestContext(request, "api.readiness.get");
  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "readiness",
    key: "readiness",
    message: "Too many readiness checks. Please try again shortly.",
    request,
    ...READINESS_RATE_LIMIT,
  });
  if ("response" in rateLimit) return rateLimit.response;

  const reviewProvider = getReviewProviderStatus();
  const capabilities = getServerLaunchCapabilities();
  const accountStorageProjectId = getFirebaseAdminProjectId();
  const publicFirebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || null;
  const checks = {
    accountStorage: isFirebaseAdminConfigured(),
    bugReportEmail: isBugReportEmailConfigured(),
    firebaseProjectMatch: Boolean(accountStorageProjectId && publicFirebaseProjectId && accountStorageProjectId === publicFirebaseProjectId),
    liveVision: reviewProvider.liveReady,
    sourceImageStorage: isFirebaseAdminStorageConfigured(),
  };
  const readiness = buildReadiness({ capabilities, checks });
  logRequestEvent("info", "readiness.checked", context, {
    ready: readiness.ok,
    profile: capabilities.profile,
    bugReportEmail: checks.bugReportEmail,
    liveVision: checks.liveVision,
  });

  return NextResponse.json({
    ...readiness,
    reviewProvider,
  }, { status: readiness.ok ? 200 : 503, headers: jsonHeaders(context, getRateHeaders(rateLimit)) });
}

function getRateHeaders(rateLimit: Awaited<ReturnType<typeof enforceRateLimit>>): HeadersInit {
  return "result" in rateLimit ? {
    "X-RateLimit-Limit": String(rateLimit.result.limit),
    "X-RateLimit-Remaining": String(rateLimit.result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateLimit.result.resetAt / 1000)),
  } : {};
}
