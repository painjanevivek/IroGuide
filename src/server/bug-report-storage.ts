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
