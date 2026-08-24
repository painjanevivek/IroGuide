import { NextResponse } from "next/server";
import { enforceRateLimit, enforceSameOriginRequest, requireVerifiedFirebaseUser } from "@/server/api-security";
import { isIroGuideAdmin } from "@/server/admin-authorization";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { getProductEvidenceReport } from "@/server/product-evidence";

const INSIGHTS_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1_000 };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request, "api.admin.insights.read");
  const originCheck = enforceSameOriginRequest(request, context, "admin_insights");
  if ("response" in originCheck) return originCheck.response;
  const auth = await requireVerifiedFirebaseUser(request, context, "admin_insights", {
    missing: "Sign in with an admin account before opening product insights.",
    unavailable: "Product insights are not available right now.",
  });
  if ("response" in auth) return auth.response;
  if (!isIroGuideAdmin(auth.user)) {
    logRequestEvent("warn", "admin_insights.forbidden", context, { user: auth.userLogId });
    return NextResponse.json({ error: "This account cannot view product insights." }, { status: 403, headers: jsonHeaders(context) });
  }

  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "admin_insights",
    key: `admin-insights:${auth.userLogId}`,
    limit: INSIGHTS_RATE_LIMIT.limit,
    message: "Too many report refreshes. Please try again shortly.",
    request,
    windowMs: INSIGHTS_RATE_LIMIT.windowMs,
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const report = await getProductEvidenceReport();
    logRequestEvent("info", "admin_insights.generated", context, {
      eventCount: report.eventCount,
      user: auth.userLogId,
    });
    return NextResponse.json({ report }, { headers: jsonHeaders(context) });
  } catch {
    logRequestEvent("error", "admin_insights.failed", context, { user: auth.userLogId });
    return NextResponse.json({ error: "Product insights could not be generated." }, { status: 503, headers: jsonHeaders(context) });
  }
}
