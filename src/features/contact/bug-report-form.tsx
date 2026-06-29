"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, Bug, CheckCircle2, LoaderCircle, Send } from "lucide-react";

type BugReportResponse = {
  submitted?: boolean;
  id?: string;
  error?: string;
};

export function BugReportForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      setSuccess("Bug report received. We will review it and reply if we need more detail.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Bug report failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="bug-report" className="bug-report-panel" aria-labelledby="bug-report-title">
      <div>
        <p className="eyebrow"><Bug /> Bug report</p>
        <h2 id="bug-report-title">Send the issue from here.</h2>
        <p>Share what broke, where it happened, and how we can contact you. Reports are stored privately and sent to the developer inbox when email delivery is configured.</p>
      </div>
      <form className="bug-report-form" onSubmit={onSubmit}>
        <label>
          <span>Name</span>
          <input autoComplete="name" maxLength={80} placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          <span>Email</span>
          <input autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="bug-report-hidden" aria-hidden="true">
          <span>Company</span>
          <input autoComplete="off" tabIndex={-1} value={company} onChange={(event) => setCompany(event.target.value)} />
        </label>
        <label>
          <span>Problem</span>
          <textarea maxLength={2_000} minLength={10} placeholder="What happened? Include the page, steps, expected result, and actual result." rows={6} value={problem} onChange={(event) => setProblem(event.target.value)} required />
        </label>
        {error && <p className="form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
        {success && <p className="form-success" role="status"><CheckCircle2 size={16} /> {success}</p>}
        <button className="button button-dark" type="submit" disabled={submitting}>
          {submitting ? <><LoaderCircle className="spin" /> Sending...</> : <>Submit bug report <Send size={17} /></>}
        </button>
      </form>
    </section>
  );
}
