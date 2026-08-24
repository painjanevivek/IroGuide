import "server-only";

import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import type { RequestContext } from "./observability";
import { jsonHeaders, logRequestEvent } from "./observability";
import { getReviewPipelineStatus } from "./review-pipeline-config";
import { ReviewPipelineError } from "./review-pipeline-storage";
import { getRequestBodyError } from "./request-body";

export function requireReviewPipeline(context: RequestContext) {
  const status = getReviewPipelineStatus();
  if (status.enabled) return null;
  logRequestEvent("info", "review_pipeline.capability_blocked", context, { mode: status.mode });
  return NextResponse.json(
    { error: "Review upload and job infrastructure is not available in the current launch profile." },
    { status: 404, headers: jsonHeaders(context) },
  );
}

export function toReviewPipelineErrorResponse(error: unknown, context: RequestContext) {
  const bodyError = getRequestBodyError(error);
  if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
  if (error instanceof ZodError) return NextResponse.json({ error: "Review pipeline identifiers or fields are invalid." }, { status: 400, headers: jsonHeaders(context) });
  if (error instanceof ReviewPipelineError) return NextResponse.json({ error: error.message }, { status: error.status, headers: jsonHeaders(context) });
  return NextResponse.json({ error: "Review pipeline request failed." }, { status: 503, headers: jsonHeaders(context) });
}

export function parseReviewPipelineId(value: string) {
  return z.uuid().parse(value);
}
