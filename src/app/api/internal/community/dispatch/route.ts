import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchNextCommunityEvent } from "@/server/community-operations";
import { getCommunitySafetyStatus } from "@/server/community-safety-config";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { isValidInternalWorkerRequest } from "@/server/review-pipeline-config";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.internal.community.dispatch");
  const safety = getCommunitySafetyStatus();
  if (safety.mode !== "staff" || !safety.ready) {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: jsonHeaders(context) });
  }
  if (!isValidInternalWorkerRequest(request)) {
    logRequestEvent("warn", "community_worker.auth_invalid", context);
    return NextResponse.json({ error: "Worker authentication failed." }, { status: 401, headers: jsonHeaders(context) });
  }
  try {
    const workerId = request.headers.get("x-worker-id")?.trim().slice(0, 128) || randomUUID();
    return NextResponse.json(await dispatchNextCommunityEvent(workerId), { headers: jsonHeaders(context) });
  } catch {
    logRequestEvent("error", "community_worker.dispatch_failed", context);
    return NextResponse.json({ error: "Community work could not be dispatched." }, { status: 500, headers: jsonHeaders(context) });
  }
}
