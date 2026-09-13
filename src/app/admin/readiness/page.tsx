import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { AuthGate } from "@/features/auth/auth-gate";
import { UserMenu } from "@/features/auth/user-menu";
import { ReadinessDiagnostics } from "@/app/beta/readiness-diagnostics";
import "@/app/route-styles.css";

export const metadata: Metadata = {
  title: "Operator Readiness",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminReadinessPage() {
  return (
    <div className="simple-page beta-page">
      <header className="simple-header beta-nav">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/status">Public status</Link><UserMenu /></nav>
      </header>
      <AuthGate>
        <main>
          <section className="beta-hero diagnostics-hero">
            <div><p className="eyebrow light"><Activity /> Operator only</p><h1>Release<br /><span>readiness.</span></h1><p>Inspect configuration-safe diagnostics after recent authentication and explicit operator authorization.</p></div>
            <div className="diagnostics-orb"><span className="mono-label">PROTECTED</span><strong>/admin</strong><p>Creative content, credentials, raw identities, and provider payloads are excluded.</p><Link href="/admin/insights">Product insights <ArrowRight /></Link></div>
          </section>
          <ReadinessDiagnostics />
        </main>
      </AuthGate>
    </div>
  );
}
