import { NextResponse } from "next/server";
import { createPublicRequestContext, enforceRateLimit } from "@/server/api-security";
import { jsonHeaders, logRequestEvent } from "@/server/observability";
import { getReadinessDiagnostics, toPublicReadiness } from "@/server/readiness-diagnostics";

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

  const diagnostics = getReadinessDiagnostics();
  const readiness = toPublicReadiness(diagnostics);
  logRequestEvent("info", "readiness.checked", context, { ready: readiness.ok });

  return NextResponse.json(readiness, { status: readiness.ok ? 200 : 503, headers: jsonHeaders(context, getRateHeaders(rateLimit)) });
}

function getRateHeaders(rateLimit: Awaited<ReturnType<typeof enforceRateLimit>>): HeadersInit {
  return "result" in rateLimit ? {
    "X-RateLimit-Limit": String(rateLimit.result.limit),
    "X-RateLimit-Remaining": String(rateLimit.result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateLimit.result.resetAt / 1000)),
  } : {};
}
