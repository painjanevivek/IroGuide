import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isBugReportEmailConfigured, sendBugReportEmail } from "./bug-report-email";
import { listBugReports, saveBugReport, updateBugReportEmailStatus, updateBugReportWorkflow } from "./bug-report-storage";

const firestoreMock = vi.hoisted(() => {
  const get = vi.fn();
  const limit = vi.fn(() => ({ get }));
  const orderBy = vi.fn(() => ({ limit }));
  const set = vi.fn();
  const docGet = vi.fn();
  const doc = vi.fn((id: string) => ({ get: docGet, id, set }));
  const collection = vi.fn(() => ({ doc, orderBy }));
  const serverTimestamp = vi.fn(() => "server-time");
  const transactionSet = vi.fn();
  const runTransaction = vi.fn(async (work: (transaction: { get: (reference: { get: () => Promise<unknown> }) => Promise<unknown>; set: typeof transactionSet }) => Promise<unknown>) => work({ get: (reference) => reference.get(), set: transactionSet }));

  return { collection, doc, docGet, get, limit, orderBy, runTransaction, serverTimestamp, set, transactionSet };
});

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminFirestore: () => ({
    collection: firestoreMock.collection,
    runTransaction: firestoreMock.runTransaction,
  }),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: firestoreMock.serverTimestamp,
  },
}));

describe("bug report storage", () => {
  beforeEach(() => {
    vi.stubEnv("IROGUIDE_LAUNCH_PROFILE", "full");
    vi.stubEnv("IROGUIDE_CAPABILITY_BUG_REPORT_EMAIL", "true");
    delete process.env.RESEND_API_KEY;
    delete process.env.BUG_REPORT_TO_EMAIL;
    delete process.env.BUG_REPORT_FROM_EMAIL;
    firestoreMock.collection.mockClear();
    firestoreMock.doc.mockClear();
    firestoreMock.docGet.mockReset();
    firestoreMock.get.mockReset();
    firestoreMock.limit.mockClear();
    firestoreMock.orderBy.mockClear();
    firestoreMock.serverTimestamp.mockClear();
    firestoreMock.set.mockClear();
    firestoreMock.runTransaction.mockClear();
    firestoreMock.transactionSet.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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

  it("lists newest bug reports from the server-only collection", async () => {
    firestoreMock.get.mockResolvedValueOnce({
      docs: [
        {
          id: "report-2",
          data: () => ({
            id: "report-2",
            name: "Second Reporter",
            email: "second@example.com",
            problem: "The review submit action failed after upload.",
            status: "new",
            source: "contact",
            emailStatus: "sent",
            emailProviderMessageId: "email-2",
            requestId: "request-2",
            createdAtIso: "2026-06-30T08:00:00.000Z",
          }),
        },
        {
          id: "report-1",
          data: () => ({
            name: "First Reporter",
            email: "first@example.com",
            problem: "The dashboard did not load saved reviews.",
            emailStatus: "failed",
            requestId: "request-1",
            createdAt: { toDate: () => new Date("2026-06-29T08:00:00.000Z") },
          }),
        },
      ],
    });

    const reports = await listBugReports(25);

    expect(firestoreMock.collection).toHaveBeenCalledWith("bugReports");
    expect(firestoreMock.orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(firestoreMock.limit).toHaveBeenCalledWith(25);
    expect(reports).toEqual([
      expect.objectContaining({
        id: "report-2",
        emailStatus: "sent",
        emailProviderMessageId: "email-2",
      }),
      expect.objectContaining({
        id: "report-1",
        emailStatus: "failed",
        createdAtIso: "2026-06-29T08:00:00.000Z",
      }),
    ]);
  });

  it("tracks assignment, internal notes, and resolution with optimistic revision", async () => {
    firestoreMock.docGet.mockResolvedValueOnce({
      exists: true,
      id: "018f1a80-7b5a-7c61-a9be-2f38de60ec98",
      data: () => ({
        id: "018f1a80-7b5a-7c61-a9be-2f38de60ec98",
        name: "Reporter",
        email: "reporter@example.com",
        problem: "The project delete confirmation did not complete.",
        status: "triaged",
        revision: 2,
        source: "contact",
        emailStatus: "disabled",
        requestId: "request-2",
        createdAtIso: "2026-09-03T10:00:00.000Z",
        updatedAtIso: "2026-09-03T10:00:00.000Z",
        assignedTo: null,
        resolution: null,
        internalNotes: [],
        recentMutationIds: [],
      }),
    });

    const report = await updateBugReportWorkflow({
      schemaVersion: 1,
      reportId: "018f1a80-7b5a-7c61-a9be-2f38de60ec98",
      expectedRevision: 2,
      mutationId: "mutation-3",
      changes: { status: "resolved", assignedTo: "Support primary", internalNote: "Verified the safe retry path.", resolution: "Retry now completes after the transfer." },
    }, "operator-a", new Date("2026-09-03T11:00:00.000Z"));

    expect(report).toMatchObject({ assignedTo: "Support primary", revision: 3, status: "resolved", resolution: "Retry now completes after the transfer." });
    expect(report.internalNotes).toEqual([expect.objectContaining({ authorId: "operator-a", body: "Verified the safe retry path." })]);
    expect(firestoreMock.transactionSet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ revision: 3, status: "resolved" }));
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

  it("records disabled delivery without contacting Resend in free mode", async () => {
    vi.stubEnv("IROGUIDE_LAUNCH_PROFILE", "free");
    vi.stubEnv("IROGUIDE_CAPABILITY_BUG_REPORT_EMAIL", "false");
    process.env.RESEND_API_KEY = "configured-but-disabled";
    process.env.BUG_REPORT_TO_EMAIL = "bugs@example.com";
    process.env.BUG_REPORT_FROM_EMAIL = "IroGuide <bugs@iroguide.com>";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

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

    expect(result).toEqual({ status: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports bug report email readiness only when all delivery settings exist", () => {
    expect(isBugReportEmailConfigured()).toBe(false);

    process.env.RESEND_API_KEY = "test-key";
    process.env.BUG_REPORT_TO_EMAIL = "bugs@example.com";
    process.env.BUG_REPORT_FROM_EMAIL = "IroGuide <bugs@iroguide.com>";

    expect(isBugReportEmailConfigured()).toBe(true);
  });
});
