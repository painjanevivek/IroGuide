import { NextResponse } from "next/server";
import { enforceRateLimit, enforceSameOriginRequest, requireVerifiedFirebaseUser } from "@/server/api-security";
import { isIroGuideAdmin } from "@/server/admin-authorization";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { getProviderControlDiagnostics } from "@/server/provider-controls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request, "api.admin.provider_controls.read");
  const origin = enforceSameOriginRequest(request, context, "admin_provider_controls");
  if ("response" in origin) return origin.response;
  const auth = await requireVerifiedFirebaseUser(request, context, "admin_provider_controls", {
    missing: "Sign in with an admin account before opening provider controls.",
    unavailable: "Provider controls are not available right now.",
  });
  if ("response" in auth) return auth.response;
  if (!isIroGuideAdmin(auth.user)) {
    logRequestEvent("warn", "admin_provider_controls.forbidden", context, { user: auth.userLogId });
    return NextResponse.json({ error: "This account cannot view provider controls." }, { status: 403, headers: jsonHeaders(context) });
  }
  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "admin_provider_controls",
    key: `admin-provider-controls:${auth.userLogId}`,
    limit: 30,
    message: "Too many provider-control refreshes.",
    request,
    windowMs: 10 * 60 * 1_000,
  });
  if ("response" in rateLimit) return rateLimit.response;
  try {
    return NextResponse.json({ diagnostics: await getProviderControlDiagnostics() }, { headers: jsonHeaders(context) });
  } catch {
    logRequestEvent("error", "admin_provider_controls.failed", context, { user: auth.userLogId });
    return NextResponse.json({ error: "Provider-control diagnostics could not be generated." }, { status: 503, headers: jsonHeaders(context) });
  }
}
