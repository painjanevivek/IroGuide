import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createDemoImprovementPlan } from "@/domain/demo-review";
import { improvementRequestSchema } from "@/domain/improvement";
import { createPublicRequestContext, enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { jsonHeaders, logRequestEvent } from "@/server/observability";

const IMPROVEMENT_RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createPublicRequestContext(request, "api.improvements.create");
  const originCheck = enforceSameOriginRequest(request, context, "improvement");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "improvement");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;

  const auth = await requireVerifiedFirebaseUser(request, context, "improvement", {
    missing: "Sign in again before generating an improvement plan.",
  });
  if ("response" in auth) return auth.response;

  const rateLimit = enforceRateLimit({
    context,
    eventPrefix: "improvement",
    key: `improvement:${auth.user.uid}`,
    message: "Too many improvement requests. Please try again shortly.",
    request,
    ...IMPROVEMENT_RATE_LIMIT,
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const body: unknown = await request.json();
    const parsed = improvementRequestSchema.parse(body);
    logRequestEvent("info", "improvement.created", context, {
      provider: "demo",
      target: parsed.target,
      user: auth.userLogId,
    });
    return NextResponse.json(createDemoImprovementPlan(parsed), { headers: jsonHeaders(context) });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Improvement details are incomplete or invalid." }, { status: 400, headers: jsonHeaders(context) });
    }
    logRequestEvent("error", "improvement.failed", context);
    return NextResponse.json({ error: "The improvement plan is unavailable right now." }, { status: 500, headers: jsonHeaders(context) });
  }
}
