"use client";

import { useEffect, useState } from "react";
import { Check, Clipboard, Inbox, LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";

type BugReportInboxItem = {
  id: string;
  name: string;
  email: string;
  problem: string;
  pageUrl?: string;
  status: "new";
  source: "contact";
  emailStatus: "pending" | "sent" | "not_configured" | "failed";
  emailProviderMessageId?: string;
  requestId: string;
  userAgent?: string;
  createdAtIso: string;
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

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let active = true;

    async function loadReports() {
      setLoading(true);
      setError("");
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch("/api/admin/bug-reports", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => ({})) as BugReportInboxResponse;
        if (!response.ok) throw new Error(payload.error ?? "Bug reports could not be loaded.");
        if (!active) return;
        setReports(Array.isArray(payload.reports) ? payload.reports : []);
      } catch (loadError) {
        if (!active) return;
        setReports([]);
        setError(loadError instanceof Error ? loadError.message : "Bug reports could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReports();

    return () => {
      active = false;
    };
  }, [user]);

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
  if (status === "not_configured") return "Email not configured";
  return `Email ${status.replace("_", " ")}`;
}
