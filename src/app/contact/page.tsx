import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, Bug, Github, LifeBuoy, Mail } from "lucide-react";
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
          <p>Email {siteConfig.supportEmail} for account, review, privacy, or product support. For product bugs, use the public GitHub Issue Form below so the report can be written and tracked openly.</p>
        </section>
        <section className="contact-list" aria-label="Contact options">
          <a href={supportMailto} data-analytics-event="contact_support_email_click"><LifeBuoy /><span><strong>Contact support</strong><small>Email {siteConfig.supportEmail} for account help, saved critique questions, privacy requests, or product support.</small></span><ArrowRight /></a>
          <a id="bug-report" href={siteConfig.bugReportUrl} target="_blank" rel="noreferrer" data-analytics-event="contact_bug_report_issue_click"><Bug /><span><strong>Write a GitHub issue</strong><small>Open the public issue form and add the page URL, steps, expected result, actual result, and browser details.</small></span><ArrowRight /></a>
          <a href={siteConfig.issuesUrl} target="_blank" rel="noreferrer" data-analytics-event="contact_public_issues_click"><Github /><span><strong>View public issues</strong><small>See submitted bug reports and follow their status in the GitHub Issues list.</small></span><ArrowRight /></a>
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
