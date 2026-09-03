import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { followUpRequestSchema } from "@/domain/follow-up";
import { createPublicRequestContext, enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { enforceCapabilityBeforeEffects } from "@/server/capability-policy";
import { jsonHeaders, logRequestEvent } from "@/server/observability";
import { enforceReviewGenerationPolicy } from "@/server/review-generation-policy";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

const FOLLOW_UP_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createPublicRequestContext(request, "api.follow_ups.create");
  const capability = enforceCapabilityBeforeEffects({
    capability: "followUpConversation",
    context,
    eventPrefix: "follow_up",
    message: "Follow-up conversation is not available yet. Continue with guided practice.",
  });
  if (!capability.allowed) return capability.response;
  const originCheck = enforceSameOriginRequest(request, context, "follow_up");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "follow_up");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;

  const auth = await requireVerifiedFirebaseUser(request, context, "follow_up", {
    missing: "Sign in again before asking a follow-up.",
  });
  if ("response" in auth) return auth.response;
  const policy = enforceReviewGenerationPolicy({ context, eventPrefix: "follow_up", user: auth.user });
  if (!policy.allowed) return policy.response;

  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "follow_up",
    key: `follow-up:${auth.user.uid}`,
    message: "Too many follow-up requests. Please try again shortly.",
    request,
    ...FOLLOW_UP_RATE_LIMIT,
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const body = await readJsonBody(request, REQUEST_BODY_LIMITS.reviewExtensionJson);
    const parsed = followUpRequestSchema.parse(body);
    logRequestEvent("info", "follow_up.created", context, {
      messages: parsed.messages.length,
      provider: "demo",
      user: auth.userLogId,
    });
    return NextResponse.json({ error: "Follow-up conversation is awaiting owner-scoped review loading." }, { status: 501, headers: jsonHeaders(context) });
  } catch (error) {
    const bodyError = getRequestBodyError(error);
    if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Follow-up details are incomplete or invalid." }, { status: 400, headers: jsonHeaders(context) });
    }
    logRequestEvent("error", "follow_up.failed", context);
    return NextResponse.json({ error: "Follow-up failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}
