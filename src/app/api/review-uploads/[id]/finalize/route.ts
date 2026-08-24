import { NextResponse } from "next/server";
import { enforceRateLimit, enforceSameOriginRequest, requireVerifiedFirebaseUser } from "@/server/api-security";
import { createRequestContext, jsonHeaders } from "@/server/observability";
import { parseReviewPipelineId, requireReviewPipeline, toReviewPipelineErrorResponse } from "@/server/review-pipeline-http";
import { finalizeReviewUpload } from "@/server/review-pipeline-storage";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = createRequestContext(request, "api.review_uploads.finalize");
  const blocked = requireReviewPipeline(context);
  if (blocked) return blocked;
  const origin = enforceSameOriginRequest(request, context, "review_uploads");
  if ("response" in origin) return origin.response;
  const auth = await requireVerifiedFirebaseUser(request, context, "review_uploads", { missing: "Sign in before finalizing an upload." });
  if ("response" in auth) return auth.response;
  const limit = await enforceRateLimit({ context, eventPrefix: "review_uploads", key: `review-upload-finalize:${auth.userLogId}`, limit: 20, message: "Too many upload requests.", request, windowMs: 10 * 60 * 1_000 });
  if ("response" in limit) return limit.response;
  try {
    const result = await finalizeReviewUpload({ id: parseReviewPipelineId((await params).id), userId: auth.user.uid });
    return NextResponse.json(result, { status: 202, headers: jsonHeaders(context) });
  } catch (error) {
    return toReviewPipelineErrorResponse(error, context);
  }
}
