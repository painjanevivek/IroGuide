import Link from "next/link";
import { ArrowRight, BookOpen, LayoutDashboard, ShieldCheck } from "lucide-react";

export function ReviewUnavailable() {
  return (
    <main className="review-unavailable-shell">
      <header className="studio-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <Link href="/dashboard">Dashboard</Link>
      </header>
      <section className="review-unavailable-card" aria-labelledby="review-unavailable-title">
        <div className="review-unavailable-icon" aria-hidden="true"><ShieldCheck /></div>
        <p className="eyebrow">Free launch protection</p>
        <h1 id="review-unavailable-title">Critique is unavailable during the free launch.</h1>
        <p>
          We have paused new AI-generated critiques until the complete provider, storage, access, and cost controls are ready.
          Your existing critique history and drafts remain available.
        </p>
        <div className="review-unavailable-actions">
          <Link className="button button-dark" href="/dashboard"><LayoutDashboard /> Dashboard <ArrowRight /></Link>
          <Link className="button-secondary" href="/docs"><BookOpen /> Read the docs</Link>
        </div>
        <p className="review-unavailable-note">
          No design image or brief is sent to an AI provider while this capability is unavailable.
        </p>
      </section>
    </main>
  );
}

export function ReviewExtensionsUnavailable() {
  return (
    <section className="review-extensions-unavailable" aria-labelledby="review-extensions-unavailable-title">
      <ShieldCheck aria-hidden="true" />
      <div>
        <p className="eyebrow">Protected free launch</p>
        <h2 id="review-extensions-unavailable-title">Further AI critique is unavailable.</h2>
        <p>Your saved critique remains readable, but follow-ups, comparisons, and generated improvement plans stay off until the complete review system is ready.</p>
      </div>
      <Link className="button-secondary" href="/docs"><BookOpen /> Review the workflow</Link>
    </section>
  );
}
