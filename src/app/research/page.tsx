import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AuthGate } from "@/features/auth/auth-gate";
import { ResearchFeedbackForm } from "@/features/research/research-feedback-form";
import styles from "./research-page.module.css";

export const metadata: Metadata = {
  title: "Free Launch Research",
  description: "Share bounded feedback about the IroGuide free experience without submitting design work or personal details.",
  robots: { index: false, follow: false, nocache: true },
};

export default function ResearchPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/docs">Docs</Link><Link href="/dashboard">Dashboard</Link></nav>
      </header>
      <main className={styles.researchMain}>
        <section className={styles.researchIntro}>
          <p className="eyebrow"><ShieldCheck /> Consent-first research</p>
          <h1>Help shape the free learning loop.</h1>
          <p>
            This short survey measures whether the current product is understandable before live critique is funded.
            It does not upload a design, request critique, or promise access to a live AI provider.
          </p>
          <div className={styles.privacyBoundary}>
            <strong>What is collected</strong>
            <span>Four categorical answers linked only to a server-side hashed account reference. Do not submit creative work, names, emails, client details, or project text.</span>
          </div>
          <Link className="button-quiet" href="/docs"><ArrowLeft /> Review the product guide</Link>
        </section>
        <AuthGate>
          <ResearchFeedbackForm />
        </AuthGate>
      </main>
    </div>
  );
}
