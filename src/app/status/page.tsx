import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { getReadinessDiagnostics, toPublicReadiness } from "@/server/readiness-diagnostics";
import "@/app/route-styles.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System Status",
  description: "Check whether IroGuide's free product is available without exposing operational configuration.",
  alternates: { canonical: "/status" },
};

export default function StatusPage() {
  const { ok } = toPublicReadiness(getReadinessDiagnostics());
  const StatusIcon = ok ? CheckCircle2 : AlertTriangle;

  return (
    <div className="simple-page beta-page">
      <header className="simple-header beta-nav">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/contact">Support</Link></nav>
      </header>
      <main>
        <section className="beta-hero diagnostics-hero">
          <div>
            <p className="eyebrow light"><ShieldCheck /> Public system status</p>
            <h1>Free product<br /><span>{ok ? "available." : "degraded."}</span></h1>
            <p>{ok ? "Core account, learning, and private workspace services are responding normally." : "One or more core services are not ready. No operational configuration is exposed here."}</p>
            <Link className="button button-lime button-large" href={ok ? "/learn" : "/contact"}>{ok ? "Continue learning" : "Contact support"} <ArrowRight /></Link>
          </div>
          <div className="diagnostics-orb" role="status" aria-live="polite">
            <span className="mono-label">CURRENT STATE</span>
            <StatusIcon aria-hidden="true" />
            <strong>{ok ? "Operational" : "Degraded"}</strong>
            <small>Public status intentionally reveals health only.</small>
          </div>
        </section>
      </main>
    </div>
  );
}
