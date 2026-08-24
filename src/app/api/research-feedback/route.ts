import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { researchFeedbackSchema } from "@/domain/product-evidence";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { getProductEvidenceStatus, recordResearchFeedback } from "@/server/product-evidence";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

const researchFeedbackRequestSchema = z.strictObject({
  feedback: researchFeedbackSchema,
  submissionId: z.uuid(),
});
const RESEARCH_FEEDBACK_RATE_LIMIT = { limit: 3, windowMs: 24 * 60 * 60 * 1_000 };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.research_feedback.create");
  const originCheck = enforceSameOriginRequest(request, context, "research_feedback");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "research_feedback");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;

  const auth = await requireVerifiedFirebaseUser(request, context, "research_feedback", {
    missing: "Sign in with a verified account before sharing research feedback.",
    unavailable: "Research feedback is not available right now.",
  });
  if ("response" in auth) return auth.response;

  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "research_feedback",
    key: `research-feedback:${auth.userLogId}`,
    limit: RESEARCH_FEEDBACK_RATE_LIMIT.limit,
    message: "Your feedback has already been received. Please return tomorrow to submit another response.",
    request,
    windowMs: RESEARCH_FEEDBACK_RATE_LIMIT.windowMs,
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const payload = researchFeedbackRequestSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.researchFeedbackJson));
    if (getProductEvidenceStatus().mode === "noop") {
      return NextResponse.json(
        { error: "Research feedback collection is currently paused." },
        { status: 503, headers: jsonHeaders(context) },
      );
    }
    const result = await recordResearchFeedback({ ...payload, userId: auth.user.uid });
    logRequestEvent("info", "research_feedback.accepted", context, { result, user: auth.userLogId });
    return NextResponse.json({ submitted: true }, { status: 201, headers: jsonHeaders(context) });
  } catch (error) {
    const bodyError = getRequestBodyError(error);
    if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Choose one option for every feedback field." }, { status: 400, headers: jsonHeaders(context) });
    }
    logRequestEvent("error", "research_feedback.failed", context, { user: auth.userLogId });
    return NextResponse.json({ error: "Research feedback could not be saved." }, { status: 503, headers: jsonHeaders(context) });
  }
}
