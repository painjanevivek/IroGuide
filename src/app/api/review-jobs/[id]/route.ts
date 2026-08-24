import { NextResponse } from "next/server";
import { enforceRateLimit, enforceSameOriginRequest, requireVerifiedFirebaseUser } from "@/server/api-security";
import { createRequestContext, jsonHeaders } from "@/server/observability";
import { parseReviewPipelineId, requireReviewPipeline, toReviewPipelineErrorResponse } from "@/server/review-pipeline-http";
import { cancelOwnedReviewJob, getOwnedReviewJob } from "@/server/review-pipeline-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, false);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, true);
}

async function handle(request: Request, params: Promise<{ id: string }>, cancel: boolean) {
  const context = createRequestContext(request, cancel ? "api.review_jobs.cancel" : "api.review_jobs.read");
  const blocked = requireReviewPipeline(context);
  if (blocked) return blocked;
  const origin = enforceSameOriginRequest(request, context, "review_jobs");
  if ("response" in origin) return origin.response;
  const auth = await requireVerifiedFirebaseUser(request, context, "review_jobs", { missing: "Sign in before opening a review job." });
  if ("response" in auth) return auth.response;
  const limit = await enforceRateLimit({ context, eventPrefix: "review_jobs", key: `review-job-read:${auth.userLogId}`, limit: 120, message: "Too many review job requests.", request, windowMs: 10 * 60 * 1_000 });
  if ("response" in limit) return limit.response;
  try {
    const id = parseReviewPipelineId((await params).id);
    const result = cancel ? await cancelOwnedReviewJob(id, auth.user.uid) : await getOwnedReviewJob(id, auth.user.uid);
    return NextResponse.json(result, { headers: jsonHeaders(context) });
  } catch (error) {
    return toReviewPipelineErrorResponse(error, context);
  }
}
