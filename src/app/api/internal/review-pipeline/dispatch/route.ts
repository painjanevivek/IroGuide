import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createRequestContext, jsonHeaders } from "@/server/observability";
import { getReviewPipelineStatus, isValidInternalWorkerRequest } from "@/server/review-pipeline-config";
import { toReviewPipelineErrorResponse } from "@/server/review-pipeline-http";
import { dispatchNextReviewPipelineEvent } from "@/server/review-pipeline-storage";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.internal.review_pipeline.dispatch");
  if (!getReviewPipelineStatus().enabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: jsonHeaders(context) });
  }
  if (!isValidInternalWorkerRequest(request)) {
    return NextResponse.json({ error: "Worker authentication failed." }, { status: 401, headers: jsonHeaders(context) });
  }
  try {
    const workerId = request.headers.get("x-worker-id")?.trim().slice(0, 128) || randomUUID();
    return NextResponse.json(await dispatchNextReviewPipelineEvent(workerId), { headers: jsonHeaders(context) });
  } catch (error) {
    return toReviewPipelineErrorResponse(error, context);
  }
}
