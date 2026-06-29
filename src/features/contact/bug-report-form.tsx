"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, Bug, CheckCircle2, Clock3, Database, LoaderCircle, MailCheck, Send, ShieldCheck } from "lucide-react";

type BugReportResponse = {
  submitted?: boolean;
  id?: string;
  error?: string;
};

const PROBLEM_MAX_LENGTH = 2_000;
const PROBLEM_MIN_LENGTH = 10;

export function BugReportForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const remainingCharacters = PROBLEM_MAX_LENGTH - problem.length;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          problem,
          company,
          pageUrl: window.location.href,
        }),
      });
      const payload = await response.json().catch(() => ({})) as BugReportResponse;
      if (!response.ok || !payload.submitted) {
        throw new Error(payload.error ?? "Bug report failed. Please try again.");
      }

      setName("");
      setEmail("");
      setProblem("");
      setCompany("");
      setSuccess(`Bug report received${payload.id ? `: ${payload.id.slice(0, 8)}` : ""}. We will review it and reply if we need more detail.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Bug report failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="bug-report" className="bug-report-panel" aria-labelledby="bug-report-title">
      <div className="bug-report-copy">
        <p className="eyebrow"><Bug /> Bug report</p>
        <h2 id="bug-report-title">Send the issue from here.</h2>
        <p>Share what broke, where it happened, and how we can contact you. Reports are stored privately and sent to the developer inbox when email delivery is configured.</p>
        <div className="bug-report-flow" aria-label="Bug report handling">
          <span><Database size={15} /> Private record</span>
          <span><MailCheck size={15} /> Developer inbox</span>
          <span><Clock3 size={15} /> Manual review</span>
        </div>
        <p className="bug-report-privacy"><ShieldCheck size={16} /> Do not include passwords, API keys, payment data, or private client material.</p>
      </div>
      <form className="bug-report-form" onSubmit={onSubmit} aria-describedby="bug-report-privacy-note">
        <label>
          <span>Name <b>Required</b></span>
          <input id="bug-report-name" autoComplete="name" maxLength={80} placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          <span>Email <b>Required</b></span>
          <small>Used only to follow up about this report.</small>
          <input id="bug-report-email" autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="bug-report-hidden" aria-hidden="true">
          <span>Company</span>
          <input autoComplete="off" tabIndex={-1} value={company} onChange={(event) => setCompany(event.target.value)} />
        </label>
        <label>
          <span>Problem <b>Required</b></span>
          <small>Include the page, steps, expected result, actual result, and browser if relevant.</small>
          <textarea id="bug-report-problem" aria-describedby="bug-report-problem-count" maxLength={PROBLEM_MAX_LENGTH} minLength={PROBLEM_MIN_LENGTH} placeholder="Example: On /review/new, uploading a PNG shows an error after I click Start review. I expected the critique to start, but the page stayed on the upload step." rows={7} value={problem} onChange={(event) => setProblem(event.target.value)} required />
        </label>
        <div className="bug-report-meta">
          <span id="bug-report-problem-count">{remainingCharacters} characters left</span>
          <span id="bug-report-privacy-note">Stored privately, not posted publicly.</span>
        </div>
        {error && <p className="form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
        {success && <p className="form-success" role="status"><CheckCircle2 size={16} /> {success}</p>}
        <button className="button button-dark" type="submit" disabled={submitting}>
          {submitting ? <><LoaderCircle className="spin" /> Sending...</> : <>Submit bug report <Send size={17} /></>}
        </button>
      </form>
    </section>
  );
}
