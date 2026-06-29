import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { bugReportRequestSchema } from "@/domain/bug-report";
import { createPublicRequestContext, enforceRateLimit, enforceSameOriginRequest, requireContentType } from "@/server/api-security";
import { sendBugReportEmail } from "@/server/bug-report-email";
import { saveBugReport, updateBugReportEmailStatus } from "@/server/bug-report-storage";
import { FirebaseAdminUnavailableError } from "@/server/firebase-admin";
import { jsonHeaders, logRequestEvent } from "@/server/observability";

const BUG_REPORT_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createPublicRequestContext(request, "api.bug_reports.create");
  const originCheck = enforceSameOriginRequest(request, context, "bug_report");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "bug_report");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;
  const rateLimit = enforceRateLimit({
    context,
    eventPrefix: "bug_report",
    key: "bug-report",
    limit: BUG_REPORT_RATE_LIMIT.limit,
    message: "Too many bug reports. Please try again shortly.",
    request,
    windowMs: BUG_REPORT_RATE_LIMIT.windowMs,
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const parsed = bugReportRequestSchema.parse(await request.json());
    const report = await saveBugReport({
      ...parsed,
      requestId: context.requestId,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    const emailResult = await sendBugReportEmail(report);
    await updateBugReportEmailStatus(report.id, emailResult.status, "providerMessageId" in emailResult ? emailResult.providerMessageId : undefined);

    logRequestEvent("info", "bug_report.created", context, {
      reportId: report.id,
      emailStatus: emailResult.status,
    });

    return NextResponse.json(
      { submitted: true, id: report.id },
      { status: 201, headers: jsonHeaders(context) },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: getBugReportValidationMessage(error) }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof FirebaseAdminUnavailableError) {
      logRequestEvent("error", "bug_report.admin_unavailable", context);
      return NextResponse.json({ error: "Bug report storage is not available right now." }, { status: 503, headers: jsonHeaders(context) });
    }

    logRequestEvent("error", "bug_report.failed", context);
    return NextResponse.json({ error: "Bug report failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}

function getBugReportValidationMessage(error: ZodError) {
  const field = error.issues[0]?.path[0];
  if (field === "name") return "Enter your name.";
  if (field === "email") return "Enter a valid email address.";
  if (field === "problem") return "Describe the problem in at least 10 characters.";
  if (field === "pageUrl") return "The page URL is invalid.";
  return "Bug report details are incomplete or invalid.";
}
