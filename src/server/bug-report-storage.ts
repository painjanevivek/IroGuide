import { randomUUID } from "node:crypto";
import { BUG_REPORT_SCHEMA_VERSION, bugReportStatuses, type BugReportRequest, type BugReportStatus, type BugReportWorkflowUpdate } from "@/domain/bug-report";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const BUG_REPORTS_COLLECTION = "bugReports";

export type BugReportEmailStatus = "pending" | "disabled" | "sent" | "not_configured" | "failed";

export type StoredBugReport = {
  schemaVersion: typeof BUG_REPORT_SCHEMA_VERSION;
  id: string;
  name: string;
  email: string;
  problem: string;
  pageUrl?: string;
  status: BugReportStatus;
  revision: number;
  source: "contact";
  emailStatus: BugReportEmailStatus;
  requestId: string;
  userAgent?: string;
  createdAtIso: string;
  updatedAtIso: string;
  assignedTo: string | null;
  resolution: string | null;
  internalNotes: BugReportInternalNote[];
  recentMutationIds: string[];
};

export type BugReportInternalNote = {
  id: string;
  authorId: string;
  body: string;
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
    schemaVersion: BUG_REPORT_SCHEMA_VERSION,
    id: randomUUID(),
    name: input.name,
    email: input.email,
    problem: input.problem,
    ...(input.pageUrl ? { pageUrl: input.pageUrl } : {}),
    status: "new",
    revision: 0,
    source: "contact",
    emailStatus: "pending",
    requestId: input.requestId,
    ...(input.userAgent ? { userAgent: input.userAgent.slice(0, 240) } : {}),
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    assignedTo: null,
    resolution: null,
    internalNotes: [],
    recentMutationIds: [],
  };

  await db.collection(BUG_REPORTS_COLLECTION).doc(document.id).set({
    ...document,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return document;
}

export class BugReportWorkflowError extends Error {
  constructor(message: string, readonly status: number, readonly currentRevision?: number) {
    super(message);
    this.name = "BugReportWorkflowError";
  }
}

export async function updateBugReportWorkflow(input: BugReportWorkflowUpdate, actorId: string, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(BUG_REPORTS_COLLECTION).doc(input.reportId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new BugReportWorkflowError("Bug report not found.", 404);
    const current = toBugReportInboxItem(snapshot.id, snapshot.data());
    if (!current) throw new BugReportWorkflowError("Bug report data is invalid.", 409);
    if (current.recentMutationIds.includes(input.mutationId)) return current;
    if (current.revision !== input.expectedRevision) {
      throw new BugReportWorkflowError("This report changed in another session. Refresh and try again.", 409, current.revision);
    }
    const updatedAtIso = now.toISOString();
    const status = input.changes.status ?? current.status;
    const resolution = input.changes.resolution === undefined ? current.resolution : input.changes.resolution;
    if ((status === "resolved" || status === "closed") && !resolution) {
      throw new BugReportWorkflowError("Add a resolution before resolving or closing the report.", 400, current.revision);
    }
    const internalNotes = input.changes.internalNote
      ? [...current.internalNotes, { id: randomUUID(), authorId: actorId, body: input.changes.internalNote, createdAtIso: updatedAtIso }].slice(-50)
      : current.internalNotes;
    const next: BugReportInboxItem = {
      ...current,
      status,
      revision: current.revision + 1,
      assignedTo: input.changes.assignedTo === undefined ? current.assignedTo : input.changes.assignedTo,
      resolution,
      internalNotes,
      recentMutationIds: [...current.recentMutationIds.filter((value) => value !== input.mutationId), input.mutationId].slice(-20),
      updatedAtIso,
    };
    transaction.set(reference, {
      ...next,
      createdAt: snapshot.data()?.createdAt,
      updatedAt: now,
    });
    return next;
  });
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
  const status = getWorkflowStatus(data.status) ?? "new";
  const revision = getNonnegativeInteger(data.revision) ?? 0;
  const assignedTo = getString(data.assignedTo);
  const resolution = getString(data.resolution);
  const internalNotes = getInternalNotes(data.internalNotes);
  const recentMutationIds = getStringArray(data.recentMutationIds, 20);
  if (!id || !name || !email || !problem || !emailStatus || !requestId || !createdAtIso) return null;
  const updatedAtIso = getString(data.updatedAtIso) ?? toIsoString(data.updatedAt) ?? createdAtIso;

  return {
    id,
    name,
    email,
    problem,
    schemaVersion: BUG_REPORT_SCHEMA_VERSION,
    status,
    revision,
    source: "contact",
    emailStatus,
    requestId,
    ...(pageUrl ? { pageUrl } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(emailProviderMessageId ? { emailProviderMessageId } : {}),
    createdAtIso,
    updatedAtIso,
    assignedTo,
    resolution,
    internalNotes,
    recentMutationIds,
  };
}

function getWorkflowStatus(value: unknown): BugReportStatus | null {
  return typeof value === "string" && bugReportStatuses.includes(value as BugReportStatus) ? value as BugReportStatus : null;
}

function getNonnegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function getStringArray(value: unknown, limit: number) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0).slice(-limit) : [];
}

function getInternalNotes(value: unknown): BugReportInternalNote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = getString(item.id);
    const authorId = getString(item.authorId);
    const body = getString(item.body);
    const createdAtIso = getString(item.createdAtIso);
    return id && authorId && body && createdAtIso ? [{ id, authorId, body, createdAtIso }] : [];
  }).slice(-50);
}

function getEmailStatus(value: unknown): BugReportEmailStatus | null {
  return value === "pending" || value === "disabled" || value === "sent" || value === "not_configured" || value === "failed" ? value : null;
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
