import { NextResponse } from "next/server";
import { enforceRateLimit, enforceSameOriginRequest, requireVerifiedFirebaseUser } from "@/server/api-security";
import { isBugReportInboxAdmin } from "@/server/admin-authorization";
import { listBugReports } from "@/server/bug-report-storage";
import { createRequestContext, jsonHeaders, logRequestEvent, toLogSafeUserId } from "@/server/observability";

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

  const rateLimit = enforceRateLimit({
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
