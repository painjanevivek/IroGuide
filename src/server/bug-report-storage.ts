import { randomUUID } from "node:crypto";
import type { BugReportRequest } from "@/domain/bug-report";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const BUG_REPORTS_COLLECTION = "bugReports";

export type BugReportEmailStatus = "pending" | "sent" | "not_configured" | "failed";

export type StoredBugReport = {
  id: string;
  name: string;
  email: string;
  problem: string;
  pageUrl?: string;
  status: "new";
  source: "contact";
  emailStatus: BugReportEmailStatus;
  requestId: string;
  userAgent?: string;
  createdAtIso: string;
};

export type BugReportInboxItem = StoredBugReport & {
  emailProviderMessageId?: string;
};

export async function saveBugReport(input: BugReportRequest & { requestId: string; userAgent?: string }) {
  const [{ FieldValue }, db] = await Promise.all([
    import("firebase-admin/firestore"),
    getFirebaseAdminFirestore(),
  ]);
  const document: StoredBugReport = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    problem: input.problem,
    ...(input.pageUrl ? { pageUrl: input.pageUrl } : {}),
    status: "new",
    source: "contact",
    emailStatus: "pending",
    requestId: input.requestId,
    ...(input.userAgent ? { userAgent: input.userAgent.slice(0, 240) } : {}),
    createdAtIso: new Date().toISOString(),
  };

  await db.collection(BUG_REPORTS_COLLECTION).doc(document.id).set({
    ...document,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return document;
}

export async function listBugReports(limitCount = 50): Promise<BugReportInboxItem[]> {
  const db = await getFirebaseAdminFirestore();
  const snapshot = await db.collection(BUG_REPORTS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();

  return snapshot.docs
    .map((document) => toBugReportInboxItem(document.id, document.data()))
    .filter((report): report is BugReportInboxItem => report !== null);
}

export async function updateBugReportEmailStatus(id: string, emailStatus: BugReportEmailStatus, providerMessageId?: string) {
  const [{ FieldValue }, db] = await Promise.all([
    import("firebase-admin/firestore"),
    getFirebaseAdminFirestore(),
  ]);

  await db.collection(BUG_REPORTS_COLLECTION).doc(id).set({
    emailStatus,
    ...(providerMessageId ? { emailProviderMessageId: providerMessageId } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

function toBugReportInboxItem(documentId: string, data: unknown): BugReportInboxItem | null {
  if (!isRecord(data)) return null;

  const id = getString(data.id) ?? documentId;
  const name = getString(data.name);
  const email = getString(data.email);
  const problem = getString(data.problem);
  const emailStatus = getEmailStatus(data.emailStatus);
  const requestId = getString(data.requestId);
  const createdAtIso = getString(data.createdAtIso) ?? toIsoString(data.createdAt);
  const pageUrl = getString(data.pageUrl);
  const userAgent = getString(data.userAgent);
  const emailProviderMessageId = getString(data.emailProviderMessageId);
  if (!id || !name || !email || !problem || !emailStatus || !requestId || !createdAtIso) return null;

  return {
    id,
    name,
    email,
    problem,
    status: "new",
    source: "contact",
    emailStatus,
    requestId,
    ...(pageUrl ? { pageUrl } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(emailProviderMessageId ? { emailProviderMessageId } : {}),
    createdAtIso,
  };
}

function getEmailStatus(value: unknown): BugReportEmailStatus | null {
  return value === "pending" || value === "sent" || value === "not_configured" || value === "failed" ? value : null;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toIsoString(value: unknown) {
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate() as Date;
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
