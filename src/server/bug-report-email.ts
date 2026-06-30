import type { StoredBugReport } from "./bug-report-storage";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";

type BugReportEmailResult = {
  status: "sent";
  providerMessageId?: string;
} | {
  status: "not_configured" | "failed";
};

export async function sendBugReportEmail(report: StoredBugReport): Promise<BugReportEmailResult> {
  const apiKey = getEnv("RESEND_API_KEY");
  const toEmail = getEnv("BUG_REPORT_TO_EMAIL");
  const fromEmail = getEnv("BUG_REPORT_FROM_EMAIL");
  if (!apiKey || !toEmail || !fromEmail) return { status: "not_configured" };

  const response = await fetch(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: report.email,
      subject: `IroGuide bug report from ${report.name}`,
      text: getBugReportEmailText(report),
    }),
  });

  if (!response.ok) return { status: "failed" };

  const payload = await response.json().catch(() => ({})) as { id?: string };
  return { status: "sent", ...(payload.id ? { providerMessageId: payload.id } : {}) };
}

export function isBugReportEmailConfigured() {
  return Boolean(getEnv("RESEND_API_KEY") && getEnv("BUG_REPORT_TO_EMAIL") && getEnv("BUG_REPORT_FROM_EMAIL"));
}

function getBugReportEmailText(report: StoredBugReport) {
  return [
    "New IroGuide bug report",
    "",
    `Report ID: ${report.id}`,
    `Name: ${report.name}`,
    `Email: ${report.email}`,
    `Page URL: ${report.pageUrl ?? "Not provided"}`,
    "",
    "Problem:",
    report.problem,
  ].join("\n");
}

function getEnv(key: string) {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}
