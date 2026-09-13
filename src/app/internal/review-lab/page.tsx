import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FlaskConical, ShieldCheck } from "lucide-react";
import "@/app/route-styles.css";

export const metadata: Metadata = {
  title: "Internal Review Lab",
  robots: { index: false, follow: false, nocache: true },
};

export default function ReviewLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/internal/review-pipeline">Review pipeline</Link></nav>
      </header>
      <main className="official-main">
        <section className="official-hero">
          <p className="eyebrow"><FlaskConical /> Development only</p>
          <h1>Review contract lab.</h1>
          <p>Exercise deterministic critique, improvement, comparison, and follow-up contracts without exposing demo output as a product capability.</p>
        </section>
        <section className="project-list" aria-label="Review lab boundaries">
          <div><ShieldCheck /><span><strong>Unavailable in production</strong><small>Both this page and its API return not found in production, regardless of profile or credentials.</small></span></div>
          <div><FlaskConical /><span><strong>Explicit internal endpoint</strong><small>POST bounded JSON to <code>/api/internal/review-lab/&lt;operation&gt;</code> during local development.</small></span></div>
        </section>
      </main>
    </div>
  );
}
