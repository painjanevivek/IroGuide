import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { bugReportWorkflowUpdateSchema } from "@/domain/bug-report";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { isBugReportInboxAdmin } from "@/server/admin-authorization";
import { BugReportWorkflowError, listBugReports, updateBugReportWorkflow } from "@/server/bug-report-storage";
import { createRequestContext, jsonHeaders, logRequestEvent, toLogSafeUserId } from "@/server/observability";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

const BUG_REPORT_INBOX_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request, "api.admin.bug_reports.list");
  const originCheck = enforceSameOriginRequest(request, context, "admin_bug_reports");
  if ("response" in originCheck) return originCheck.response;

  const auth = await requireVerifiedFirebaseUser(request, context, "admin_bug_reports", {
    missing: "Sign in with an admin account before opening bug reports.",
    unavailable: "Bug report inbox is not available right now.",
  });
  if ("response" in auth) return auth.response;

  if (!isBugReportInboxAdmin(auth.user)) {
    logRequestEvent("warn", "admin_bug_reports.forbidden", context, { user: auth.userLogId });
    return NextResponse.json({ error: "This account cannot view bug reports." }, { status: 403, headers: jsonHeaders(context) });
  }

  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "admin_bug_reports",
    key: `admin-bug-reports:${auth.user.uid}`,
    limit: BUG_REPORT_INBOX_RATE_LIMIT.limit,
    message: "Too many inbox refreshes. Please try again shortly.",
    request,
    windowMs: BUG_REPORT_INBOX_RATE_LIMIT.windowMs,
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const reports = await listBugReports();
    logRequestEvent("info", "admin_bug_reports.listed", context, {
      count: reports.length,
      user: toLogSafeUserId(auth.user.uid),
    });
    return NextResponse.json({ reports }, { headers: jsonHeaders(context) });
  } catch {
    logRequestEvent("error", "admin_bug_reports.failed", context);
    return NextResponse.json({ error: "Bug reports could not be loaded." }, { status: 500, headers: jsonHeaders(context) });
  }
}

export async function PATCH(request: Request) {
  const context = createRequestContext(request, "api.admin.bug_reports.update");
  const originCheck = enforceSameOriginRequest(request, context, "admin_bug_reports_update");
  if ("response" in originCheck) return originCheck.response;
  const contentType = requireContentType(request, context, "admin_bug_reports_update");
  if ("response" in contentType) return contentType.response;
  const auth = await requireVerifiedFirebaseUser(request, context, "admin_bug_reports_update", {
    missing: "Sign in with an admin account before updating bug reports.",
    unavailable: "Bug report workflow is not available right now.",
  });
  if ("response" in auth) return auth.response;
  if (!isBugReportInboxAdmin(auth.user)) {
    logRequestEvent("warn", "admin_bug_reports_update.forbidden", context, { user: auth.userLogId });
    return NextResponse.json({ error: "This account cannot update bug reports." }, { status: 403, headers: jsonHeaders(context) });
  }
  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "admin_bug_reports_update",
    key: `admin-bug-reports-update:${auth.user.uid}`,
    limit: 60,
    message: "Too many bug report updates. Please try again shortly.",
    request,
    windowMs: BUG_REPORT_INBOX_RATE_LIMIT.windowMs,
  });
  if ("response" in rateLimit) return rateLimit.response;
  try {
    const input = bugReportWorkflowUpdateSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.bugReportJson));
    const report = await updateBugReportWorkflow(input, auth.user.uid);
    logRequestEvent("info", "admin_bug_reports.updated", context, {
      reportId: report.id,
      status: report.status,
      user: toLogSafeUserId(auth.user.uid),
    });
    return NextResponse.json({ report }, { headers: jsonHeaders(context) });
  } catch (error) {
    const bodyError = getRequestBodyError(error);
    if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
    if (error instanceof ZodError) return NextResponse.json({ error: "Bug report workflow details are invalid." }, { status: 400, headers: jsonHeaders(context) });
    if (error instanceof BugReportWorkflowError) {
      return NextResponse.json({ error: error.message, currentRevision: error.currentRevision }, { status: error.status, headers: jsonHeaders(context) });
    }
    logRequestEvent("error", "admin_bug_reports.update_failed", context);
    return NextResponse.json({ error: "Bug report could not be updated." }, { status: 500, headers: jsonHeaders(context) });
  }
}
