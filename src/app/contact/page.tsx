import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, Bug, Github, LifeBuoy, Mail, MessageSquareText } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Contact ${siteConfig.name}`,
  description:
    `Contact IroGuide support at ${siteConfig.supportEmail}, request beta access, or report a product bug.`,
  alternates: {
    canonical: "/contact",
  },
};

const supportMailto = createMailto(siteConfig.supportEmail, "IroGuide support request");
const bugReportMailto = createMailto(
  siteConfig.bugReportEmail,
  "IroGuide bug report",
  [
    "What happened:",
    "",
    "Page URL:",
    "",
    "Steps to reproduce:",
    "1.",
    "2.",
    "3.",
    "",
    "Expected result:",
    "",
    "Actual result:",
    "",
    "Device/browser:",
  ].join("\n"),
);

export default function ContactPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/about">About</Link><Link href="/projects">Projects</Link></nav>
      </header>
      <main className="official-main">
        <section className="official-hero contact-hero">
          <p className="eyebrow"><Mail /> Contact IroGuide</p>
          <h1>Questions, support, bug reports, or collaboration.</h1>
          <p>Email {siteConfig.supportEmail} for account, review, privacy, or product support. Use the bug report option for broken flows, sync issues, upload failures, or unexpected review results.</p>
        </section>
        <section className="contact-list" aria-label="Contact options">
          <a href={supportMailto} data-analytics-event="contact_support_email_click"><LifeBuoy /><span><strong>Contact support</strong><small>Email {siteConfig.supportEmail} for account help, saved critique questions, privacy requests, or product support.</small></span><ArrowRight /></a>
          <a id="bug-report" href={bugReportMailto} data-analytics-event="contact_bug_report_click"><Bug /><span><strong>Report a bug</strong><small>Email {siteConfig.bugReportEmail} with the page URL, steps to reproduce, expected result, actual result, and browser details.</small></span><ArrowRight /></a>
          <Link href="/beta"><MessageSquareText /><span><strong>Beta access</strong><small>Join the early product path and try the critique workflow.</small></span><ArrowRight /></Link>
          <Link href="/review/new"><Mail /><span><strong>Design critique support</strong><small>Start a private review and test the feedback experience.</small></span><ArrowRight /></Link>
          <a href={siteConfig.repositoryUrl} target="_blank" rel="noreferrer"><Github /><span><strong>Project repository</strong><small>Review related IroGuide engineering work on GitHub.</small></span><ArrowRight /></a>
        </section>
      </main>
    </div>
  );
}

function createMailto(email: string, subject: string, body?: string) {
  const params = new URLSearchParams({ subject });
  if (body) params.set("body", body);
  return `mailto:${email}?${params.toString()}`;
}
