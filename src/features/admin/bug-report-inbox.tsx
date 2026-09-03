"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Clipboard, Inbox, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";

type BugReportInboxItem = {
  id: string;
  name: string;
  email: string;
  problem: string;
  pageUrl?: string;
  status: "new" | "triaged" | "in-progress" | "resolved" | "closed";
  revision: number;
  source: "contact";
  emailStatus: "pending" | "disabled" | "sent" | "not_configured" | "failed";
  emailProviderMessageId?: string;
  requestId: string;
  userAgent?: string;
  createdAtIso: string;
  updatedAtIso: string;
  assignedTo: string | null;
  resolution: string | null;
  internalNotes: Array<{ id: string; authorId: string; body: string; createdAtIso: string }>;
};

type BugReportInboxResponse = {
  reports?: BugReportInboxItem[];
  error?: string;
};

export function BugReportInbox() {
  const { user } = useAuth();
  const [reports, setReports] = useState<BugReportInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/bug-reports", { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({})) as BugReportInboxResponse;
      if (!response.ok) throw new Error(payload.error ?? "Bug reports could not be loaded.");
      setReports(Array.isArray(payload.reports) ? payload.reports : []);
    } catch (loadError) {
      setReports([]);
      setError(loadError instanceof Error ? loadError.message : "Bug reports could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => void loadReports(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReports, user]);

  async function updateReport(report: BugReportInboxItem, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const note = String(data.get("internalNote") ?? "").trim();
    setBusyId(report.id);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/bug-reports", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          reportId: report.id,
          expectedRevision: report.revision,
          mutationId: crypto.randomUUID(),
          changes: {
            status: String(data.get("status")),
            assignedTo: String(data.get("assignedTo") ?? "").trim() || null,
            resolution: String(data.get("resolution") ?? "").trim() || null,
            ...(note ? { internalNote: note } : {}),
          },
        }),
      });
      const payload = await response.json().catch(() => ({})) as { report?: BugReportInboxItem; error?: string };
      if (!response.ok || !payload.report) throw new Error(payload.error ?? "Bug report could not be updated.");
      setReports((current) => current.map((item) => item.id === payload.report?.id ? payload.report : item));
      form.reset();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Bug report could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Private admin</p>
          <h1>Bug report<br />inbox.</h1>
        </div>
      </div>
      <div className="workspace-badge">
        <ShieldCheck />
        <div>
          <strong>Server-only collection view</strong>
          <span>Reports are loaded through an admin-guarded API route and sorted newest first.</span>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-empty is-loading">
          <div><LoaderCircle className="spin" size={38} /><h2>Loading reports</h2><p>Reading the private bug report collection.</p></div>
        </div>
      ) : error ? (
        <div className="dashboard-empty is-error">
          <div><Inbox size={38} /><h2>Inbox unavailable</h2><p>{error}</p></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="dashboard-empty">
          <div><Inbox size={38} /><h2>No bug reports yet</h2><p>New contact form reports will appear here after they are stored in Firestore.</p></div>
        </div>
      ) : (
        <section className="review-history" aria-label="Bug reports">
          {reports.map((report) => (
            <article className="history-card" key={report.id}>
              <span>{formatEmailStatus(report.emailStatus)}</span>
              <strong>{report.name}</strong>
              <p>{report.problem}</p>
              <p><a href={`mailto:${report.email}`}>{report.email}</a></p>
              {report.pageUrl && <p><a href={report.pageUrl} target="_blank" rel="noreferrer">{report.pageUrl}</a></p>}
              <time dateTime={report.createdAtIso}>{new Date(report.createdAtIso).toLocaleString()}</time>
              <form className="bug-report-workflow" key={`${report.id}:${report.revision}`} onSubmit={(event) => void updateReport(report, event)}>
                <label>Status<select name="status" defaultValue={report.status}><option value="new">New</option><option value="triaged">Triaged</option><option value="in-progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label>
                <label>Assigned to<input name="assignedTo" defaultValue={report.assignedTo ?? ""} maxLength={120} placeholder="Operator name or queue" /></label>
                <label>Resolution<textarea name="resolution" defaultValue={report.resolution ?? ""} maxLength={2000} rows={3} placeholder="Required before resolving or closing" /></label>
                <label>New internal note<textarea name="internalNote" maxLength={2000} rows={3} placeholder="Visible only to authorized operators" /></label>
                {report.internalNotes.length > 0 && <details><summary>{report.internalNotes.length} internal note{report.internalNotes.length === 1 ? "" : "s"}</summary><ol>{report.internalNotes.map((note) => <li key={note.id}><p>{note.body}</p><small>{new Date(note.createdAtIso).toLocaleString()}</small></li>)}</ol></details>}
                <button className="button button-small" disabled={busyId === report.id} type="submit">{busyId === report.id ? <LoaderCircle className="spin" /> : <Save />} Save workflow</button>
              </form>
              <CopyButton value={report.id} label="Copy report ID" />
              <CopyButton value={report.requestId} label="Copy request ID" />
              {report.emailProviderMessageId && <CopyButton value={report.emailProviderMessageId} label="Copy email ID" />}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="button-secondary" type="button" onClick={() => void copy()} aria-label={`${label}: ${value}`}>
      {copied ? <Check size={16} /> : <Clipboard size={16} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function formatEmailStatus(status: BugReportInboxItem["emailStatus"]) {
  if (status === "disabled") return "Email intentionally disabled";
  if (status === "not_configured") return "Email not configured";
  return `Email ${status.replace("_", " ")}`;
}
