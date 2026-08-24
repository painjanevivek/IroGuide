import { NextResponse } from "next/server";
import { createReviewJobRequestSchema } from "@/domain/review-pipeline";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { createRequestContext, jsonHeaders } from "@/server/observability";
import { enforceReviewGenerationPolicy } from "@/server/review-generation-policy";
import { requireReviewPipeline, toReviewPipelineErrorResponse } from "@/server/review-pipeline-http";
import { createReviewJob } from "@/server/review-pipeline-storage";
import { readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.review_jobs.create");
  const blocked = requireReviewPipeline(context);
  if (blocked) return blocked;
  const origin = enforceSameOriginRequest(request, context, "review_jobs");
  if ("response" in origin) return origin.response;
  const contentType = requireContentType(request, context, "review_jobs");
  if ("response" in contentType) return contentType.response;
  const auth = await requireVerifiedFirebaseUser(request, context, "review_jobs", { missing: "Sign in before creating a review job." });
  if ("response" in auth) return auth.response;
  const policy = enforceReviewGenerationPolicy({ context, eventPrefix: "review_jobs", user: auth.user });
  if (!policy.allowed) return policy.response;
  const limit = await enforceRateLimit({ context, eventPrefix: "review_jobs", key: `review-jobs:${auth.userLogId}`, limit: 12, message: "Too many review jobs.", request, windowMs: 10 * 60 * 1_000 });
  if ("response" in limit) return limit.response;
  try {
    const payload = createReviewJobRequestSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.reviewPipelineJson));
    const result = await createReviewJob({ ...payload, userId: auth.user.uid });
    return NextResponse.json({ created: result.created, job: toProjection(result.job) }, { status: result.created ? 201 : 200, headers: jsonHeaders(context) });
  } catch (error) {
    return toReviewPipelineErrorResponse(error, context);
  }
}

function toProjection(job: Awaited<ReturnType<typeof createReviewJob>>["job"]) {
  return { id: job.id, status: job.status, attempt: job.attempt, failureClass: job.failureClass, resultDocumentId: job.resultDocumentId, createdAt: job.createdAt, updatedAt: job.updatedAt };
}
