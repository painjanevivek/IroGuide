import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { comparisonRequestSchema } from "@/domain/comparison";
import { createDemoComparison } from "@/domain/demo-comparison";
import { createPublicRequestContext, enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { jsonHeaders, logRequestEvent } from "@/server/observability";
import { enforceReviewGenerationPolicy } from "@/server/review-generation-policy";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

const COMPARISON_RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createPublicRequestContext(request, "api.comparisons.create");
  const originCheck = enforceSameOriginRequest(request, context, "comparison");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "comparison");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;

  const auth = await requireVerifiedFirebaseUser(request, context, "comparison", {
    missing: "Sign in again before comparing a revision.",
  });
  if ("response" in auth) return auth.response;
  const policy = enforceReviewGenerationPolicy({ context, eventPrefix: "comparison", user: auth.user });
  if (!policy.allowed) return policy.response;

  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "comparison",
    key: `comparison:${auth.user.uid}`,
    message: "Too many comparison requests. Please try again shortly.",
    request,
    ...COMPARISON_RATE_LIMIT,
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const body = await readJsonBody(request, REQUEST_BODY_LIMITS.reviewExtensionJson);
    const parsed = comparisonRequestSchema.parse(body);
    logRequestEvent("info", "comparison.created", context, {
      provider: "demo",
      user: auth.userLogId,
    });
    return NextResponse.json(createDemoComparison(parsed), { headers: jsonHeaders(context) });
  } catch (error) {
    const bodyError = getRequestBodyError(error);
    if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Comparison details are incomplete or invalid." }, { status: 400, headers: jsonHeaders(context) });
    }
    logRequestEvent("error", "comparison.failed", context);
    return NextResponse.json({ error: "Comparison failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}
