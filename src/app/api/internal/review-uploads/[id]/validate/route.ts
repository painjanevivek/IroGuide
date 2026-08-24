import { NextResponse } from "next/server";
import { createRequestContext, jsonHeaders } from "@/server/observability";
import { isValidInternalWorkerRequest, getReviewPipelineStatus } from "@/server/review-pipeline-config";
import { parseReviewPipelineId, toReviewPipelineErrorResponse } from "@/server/review-pipeline-http";
import { validateStoredReviewUpload } from "@/server/review-pipeline-storage";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = createRequestContext(request, "api.internal.review_uploads.validate");
  if (!getReviewPipelineStatus().enabled) return NextResponse.json({ error: "Not found." }, { status: 404, headers: jsonHeaders(context) });
  if (!isValidInternalWorkerRequest(request)) return NextResponse.json({ error: "Worker authentication failed." }, { status: 401, headers: jsonHeaders(context) });
  try {
    const validation = await validateStoredReviewUpload(parseReviewPipelineId((await params).id));
    return NextResponse.json({ validated: true, validation }, { headers: jsonHeaders(context) });
  } catch (error) {
    return toReviewPipelineErrorResponse(error, context);
  }
}
