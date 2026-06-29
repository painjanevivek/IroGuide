import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, Github, LifeBuoy, Mail } from "lucide-react";
import { siteConfig } from "@/config/site";
import { BugReportForm } from "@/features/contact/bug-report-form";

export const metadata: Metadata = {
  title: `Contact ${siteConfig.name}`,
  description:
    `Contact IroGuide support at ${siteConfig.supportEmail}, request beta access, or report a product bug.`,
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
          <p>Email {siteConfig.supportEmail} for account, review, privacy, or product support. For product bugs, use the form below so the report is stored privately and sent to the developer inbox.</p>
        </section>
        <BugReportForm />
        <section className="contact-list" aria-label="Contact options">
          <a href={supportMailto} data-analytics-event="contact_support_email_click"><LifeBuoy /><span><strong>Contact support</strong><small>Email {siteConfig.supportEmail} for account help, saved critique questions, privacy requests, or product support.</small></span><ArrowRight /></a>
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
