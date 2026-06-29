import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendBugReportEmail } from "./bug-report-email";
import { saveBugReport, updateBugReportEmailStatus } from "./bug-report-storage";

const firestoreMock = vi.hoisted(() => {
  const set = vi.fn();
  const doc = vi.fn(() => ({ set }));
  const collection = vi.fn(() => ({ doc }));
  const serverTimestamp = vi.fn(() => "server-time");

  return { collection, doc, serverTimestamp, set };
});

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminFirestore: () => ({
    collection: firestoreMock.collection,
  }),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: firestoreMock.serverTimestamp,
  },
}));

describe("bug report storage", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.BUG_REPORT_TO_EMAIL;
    delete process.env.BUG_REPORT_FROM_EMAIL;
    firestoreMock.collection.mockClear();
    firestoreMock.doc.mockClear();
    firestoreMock.serverTimestamp.mockClear();
    firestoreMock.set.mockClear();
  });

  it("stores public bug reports in the server-only collection", async () => {
    const report = await saveBugReport({
      name: "Vivek Painjane",
      email: "vivek@example.com",
      problem: "The contact form submit button did not work.",
      pageUrl: "https://iroguide.com/contact",
      requestId: "request-1",
      userAgent: "Playwright",
    });

    expect(report.id).toHaveLength(36);
    expect(firestoreMock.collection).toHaveBeenCalledWith("bugReports");
    expect(firestoreMock.doc).toHaveBeenCalledWith(report.id);
    expect(firestoreMock.set).toHaveBeenCalledWith(expect.objectContaining({
      id: report.id,
      email: "vivek@example.com",
      emailStatus: "pending",
      problem: "The contact form submit button did not work.",
      source: "contact",
      status: "new",
    }));
  });

  it("updates email delivery status after notification attempts", async () => {
    await updateBugReportEmailStatus("report-1", "sent", "email-1");

    expect(firestoreMock.collection).toHaveBeenCalledWith("bugReports");
    expect(firestoreMock.doc).toHaveBeenCalledWith("report-1");
    expect(firestoreMock.set).toHaveBeenCalledWith(expect.objectContaining({
      emailProviderMessageId: "email-1",
      emailStatus: "sent",
    }), { merge: true });
  });

  it("does not send email when provider settings are missing", async () => {
    const result = await sendBugReportEmail({
      id: "report-1",
      name: "Vivek Painjane",
      email: "vivek@example.com",
      problem: "The contact form submit button did not work.",
      status: "new",
      source: "contact",
      emailStatus: "pending",
      requestId: "request-1",
      createdAtIso: new Date().toISOString(),
    });

    expect(result).toEqual({ status: "not_configured" });
  });
});
