import { NextResponse } from "next/server";
import { createRequestContext, jsonHeaders } from "@/server/observability";
import { getReviewPipelineStatus, isValidInternalWorkerRequest } from "@/server/review-pipeline-config";
import { toReviewPipelineErrorResponse } from "@/server/review-pipeline-http";
import { getReviewPipelineDiagnostics, reconcileReviewPipeline } from "@/server/review-pipeline-storage";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.internal.review_pipeline.reconcile");
  if (!getReviewPipelineStatus().enabled) return NextResponse.json({ error: "Not found." }, { status: 404, headers: jsonHeaders(context) });
  if (!isValidInternalWorkerRequest(request)) return NextResponse.json({ error: "Worker authentication failed." }, { status: 401, headers: jsonHeaders(context) });
  try {
    const reconciliation = await reconcileReviewPipeline();
    const diagnostics = await getReviewPipelineDiagnostics();
    return NextResponse.json({ reconciliation, diagnostics }, { headers: jsonHeaders(context) });
  } catch (error) {
    return toReviewPipelineErrorResponse(error, context);
  }
}
