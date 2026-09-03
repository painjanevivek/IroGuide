import { NextResponse } from "next/server";
import { createReviewUploadRequestSchema } from "@/domain/review-pipeline";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { createRequestContext, jsonHeaders } from "@/server/observability";
import { requireReviewPipeline, toReviewPipelineErrorResponse } from "@/server/review-pipeline-http";
import { createReviewUploadSession } from "@/server/review-pipeline-storage";
import { readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.review_uploads.create");
  const blocked = requireReviewPipeline(context);
  if (blocked) return blocked;
  const origin = enforceSameOriginRequest(request, context, "review_uploads");
  if ("response" in origin) return origin.response;
  const contentType = requireContentType(request, context, "review_uploads");
  if ("response" in contentType) return contentType.response;
  const auth = await requireVerifiedFirebaseUser(request, context, "review_uploads", {
    missing: "Sign in with a verified account before authorizing an upload.",
    unavailable: "Review uploads are not available right now.",
  });
  if ("response" in auth) return auth.response;
  const limit = await enforceRateLimit({ context, eventPrefix: "review_uploads", key: `review-uploads:${auth.userLogId}`, limit: 12, message: "Too many upload authorizations.", request, windowMs: 10 * 60 * 1_000 });
  if ("response" in limit) return limit.response;
  try {
    const payload = createReviewUploadRequestSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.reviewPipelineJson));
    const { session, uploadFields, uploadMethod, uploadUrl } = await createReviewUploadSession({ contentType: payload.contentType, projectId: payload.projectId, userId: auth.user.uid });
    return NextResponse.json({ id: session.id, uploadFields, uploadMethod, uploadUrl, expiresAt: session.expiresAt, maxBytes: session.maxBytes }, { status: 201, headers: jsonHeaders(context) });
  } catch (error) {
    return toReviewPipelineErrorResponse(error, context);
  }
}
