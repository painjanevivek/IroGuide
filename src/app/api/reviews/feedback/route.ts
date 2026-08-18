import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { reviewFindingFeedbackSchema } from "@/domain/review-feedback";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { ReviewFeedbackAuthorizationError, saveReviewFindingFeedback } from "@/server/review-feedback";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { getRateLimitHeaders } from "@/server/rate-limit";

const FEEDBACK_RATE_LIMIT = { limit: 20, windowMs: 60_000 };

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.reviews.feedback");
  const originCheck = enforceSameOriginRequest(request, context, "review_feedback");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "review_feedback");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;

  const auth = await requireVerifiedFirebaseUser(request, context, "review_feedback", {
    missing: "Sign in again before rating a critique finding.",
  });
  if ("response" in auth) return auth.response;
  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "review_feedback",
    key: `review-feedback:${auth.user.uid}`,
    request,
    ...FEEDBACK_RATE_LIMIT,
    message: "Too many feedback requests. Please try again shortly.",
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const feedback = reviewFindingFeedbackSchema.parse(await request.json());
    const saved = await saveReviewFindingFeedback(auth.user.uid, feedback);
    logRequestEvent("info", "review_feedback.saved", context, { verdict: feedback.verdict, reason: feedback.reason ?? "none" });
    return NextResponse.json({ feedback: saved }, { headers: jsonHeaders(context, getRateLimitHeaders(rateLimit.result)) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Feedback details are invalid." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ReviewFeedbackAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403, headers: jsonHeaders(context) });
    }
    logRequestEvent("error", "review_feedback.failed", context);
    return NextResponse.json({ error: "Feedback could not be saved right now." }, { status: 503, headers: jsonHeaders(context) });
  }
}
