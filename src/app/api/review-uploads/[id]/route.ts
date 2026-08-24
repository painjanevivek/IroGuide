import { NextResponse } from "next/server";
import { enforceRateLimit, enforceSameOriginRequest, requireVerifiedFirebaseUser } from "@/server/api-security";
import { createRequestContext, jsonHeaders } from "@/server/observability";
import { parseReviewPipelineId, requireReviewPipeline, toReviewPipelineErrorResponse } from "@/server/review-pipeline-http";
import { getOwnedReviewUpload, revokeReviewUpload } from "@/server/review-pipeline-storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, false);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, true);
}

async function handle(request: Request, params: Promise<{ id: string }>, revoke: boolean) {
  const context = createRequestContext(request, revoke ? "api.review_uploads.revoke" : "api.review_uploads.read");
  const blocked = requireReviewPipeline(context);
  if (blocked) return blocked;
  const origin = enforceSameOriginRequest(request, context, "review_uploads");
  if ("response" in origin) return origin.response;
  const auth = await requireVerifiedFirebaseUser(request, context, "review_uploads", { missing: "Sign in before revoking an upload." });
  if ("response" in auth) return auth.response;
  const limit = await enforceRateLimit({ context, eventPrefix: "review_uploads", key: `review-upload-revoke:${auth.userLogId}`, limit: 20, message: "Too many upload requests.", request, windowMs: 10 * 60 * 1_000 });
  if ("response" in limit) return limit.response;
  try {
    const id = parseReviewPipelineId((await params).id);
    const result = revoke
      ? await revokeReviewUpload({ id, userId: auth.user.uid })
      : await getOwnedReviewUpload(id, auth.user.uid);
    return NextResponse.json(result, { headers: jsonHeaders(context) });
  } catch (error) {
    return toReviewPipelineErrorResponse(error, context);
  }
}
