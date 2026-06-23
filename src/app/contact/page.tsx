import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Github, Mail, MessageSquareText } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Contact ${siteConfig.name}`,
  description:
    "Contact IroGuide for beta access, product questions, design critique support, and collaboration inquiries.",
  alternates: {
    canonical: "/contact",
  },
};

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
          <h1>Questions, beta access, support, or collaboration.</h1>
          <p>Use the live product paths below to reach the right IroGuide workflow while the public contact channel is being finalized.</p>
        </section>
        <section className="contact-list" aria-label="Contact options">
          <Link href="/beta"><MessageSquareText /><span><strong>Beta access</strong><small>Join the early product path and try the critique workflow.</small></span><ArrowRight /></Link>
          <Link href="/review/new"><Mail /><span><strong>Design critique support</strong><small>Start a private review and test the feedback experience.</small></span><ArrowRight /></Link>
          <a href={siteConfig.repositoryUrl} target="_blank" rel="noreferrer"><Github /><span><strong>Project repository</strong><small>Review related IroGuide engineering work on GitHub.</small></span><ArrowRight /></a>
        </section>
      </main>
    </div>
  );
}
