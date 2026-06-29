import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, Bug, Github, LifeBuoy, Mail, MessageSquareText } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Contact ${siteConfig.name}`,
  description:
    `Contact IroGuide support at ${siteConfig.supportEmail}, request beta access, or report a product bug on GitHub.`,
  alternates: {
    canonical: "/contact",
  },
};

const supportMailto = createMailto(siteConfig.supportEmail, "IroGuide support request");

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
          <p>Email {siteConfig.supportEmail} for account, review, privacy, or product support. For product bugs, submit a public GitHub Issue Form so the report can be tracked openly.</p>
        </section>
        <section className="contact-list" aria-label="Contact options">
          <a href={supportMailto} data-analytics-event="contact_support_email_click"><LifeBuoy /><span><strong>Contact support</strong><small>Email {siteConfig.supportEmail} for account help, saved critique questions, privacy requests, or product support.</small></span><ArrowRight /></a>
          <a id="bug-report" href={siteConfig.bugReportUrl} target="_blank" rel="noreferrer" data-analytics-event="contact_bug_report_issue_click"><Bug /><span><strong>Report a public GitHub issue</strong><small>Use the GitHub Issue Form for bugs. Include the page URL, steps, expected result, actual result, and browser details.</small></span><ArrowRight /></a>
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
