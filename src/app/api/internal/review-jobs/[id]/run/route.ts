import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createRequestContext, jsonHeaders } from "@/server/observability";
import { isValidInternalWorkerRequest, getReviewPipelineStatus } from "@/server/review-pipeline-config";
import { parseReviewPipelineId, toReviewPipelineErrorResponse } from "@/server/review-pipeline-http";
import { runReviewJob } from "@/server/review-pipeline-storage";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = createRequestContext(request, "api.internal.review_jobs.run");
  if (!getReviewPipelineStatus().enabled) return NextResponse.json({ error: "Not found." }, { status: 404, headers: jsonHeaders(context) });
  if (!isValidInternalWorkerRequest(request)) return NextResponse.json({ error: "Worker authentication failed." }, { status: 401, headers: jsonHeaders(context) });
  try {
    const job = await runReviewJob(parseReviewPipelineId((await params).id), request.headers.get("x-worker-id")?.slice(0, 128) || randomUUID());
    return NextResponse.json({ job }, { headers: jsonHeaders(context) });
  } catch (error) {
    return toReviewPipelineErrorResponse(error, context);
  }
}
