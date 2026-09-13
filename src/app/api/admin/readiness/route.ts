import { NextResponse } from "next/server";
import { enforceRateLimit, enforceSameOriginRequest, requireVerifiedFirebaseUser } from "@/server/api-security";
import { isIroGuideAdmin } from "@/server/admin-authorization";
import { createRequestContext, jsonHeaders, logRequestEvent, toLogSafeUserId } from "@/server/observability";
import { getReadinessDiagnostics } from "@/server/readiness-diagnostics";

const ADMIN_READINESS_RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request, "api.admin.readiness.get");
  const originCheck = enforceSameOriginRequest(request, context, "admin_readiness");
  if ("response" in originCheck) return originCheck.response;

  const auth = await requireVerifiedFirebaseUser(request, context, "admin_readiness", {
    missing: "Sign in with an authorized project account to view deployment diagnostics.",
    unavailable: "Deployment diagnostics are not available right now.",
  });
  if ("response" in auth) return auth.response;

  if (!isIroGuideAdmin(auth.user)) {
    logRequestEvent("warn", "admin_readiness.forbidden", context, { user: auth.userLogId });
    return NextResponse.json({ error: "This account cannot view deployment diagnostics." }, { status: 403, headers: jsonHeaders(context) });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (auth.user.auth_time < nowSeconds - 15 * 60) {
    logRequestEvent("warn", "admin_readiness.reauthentication_required", context, { user: auth.userLogId });
    return NextResponse.json(
      { error: "Sign in again before viewing deployment diagnostics.", code: "recent_authentication_required" },
      { status: 403, headers: jsonHeaders(context) },
    );
  }

  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "admin_readiness",
    key: `admin-readiness:${auth.user.uid}`,
    limit: ADMIN_READINESS_RATE_LIMIT.limit,
    message: "Too many deployment diagnostic requests. Please try again shortly.",
    request,
    windowMs: ADMIN_READINESS_RATE_LIMIT.windowMs,
  });
  if ("response" in rateLimit) return rateLimit.response;

  const diagnostics = getReadinessDiagnostics();
  logRequestEvent("info", "admin_readiness.checked", context, { ready: diagnostics.ok, user: toLogSafeUserId(auth.user.uid) });
  return NextResponse.json(diagnostics, { status: diagnostics.ok ? 200 : 503, headers: jsonHeaders(context) });
}
