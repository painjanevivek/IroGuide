import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, Github, LockKeyhole, Rocket, ShieldCheck } from "lucide-react";
import { HeaderAuthLinks } from "@/features/auth/auth-nav";
import { siteConfig } from "@/config/site";
import { ReadinessDiagnostics } from "./readiness-diagnostics";

export const metadata: Metadata = {
  title: "IroGuide Free Launch Readiness",
  description: "Check IroGuide account, traffic-safety, request-budget, and capability-gate readiness without exposing operational details publicly.",
  alternates: {
    canonical: "/beta",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  openGraph: {
    title: "IroGuide Free Launch Readiness",
    description: "Check IroGuide account, traffic-safety, request-budget, and capability-gate readiness.",
    url: `${siteConfig.url}/beta`,
  },
};

export default function BetaPage() { return <div className="beta-page"><header className="simple-header beta-nav"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><nav><Link href="/pricing">Pricing preview</Link><HeaderAuthLinks includeDashboard={false} /></nav></header><main><section className="beta-hero diagnostics-hero"><div><p className="eyebrow light"><Rocket /> Free launch readiness</p><h1>Deployment<br /><span>diagnostics.</span></h1><p>Verify the infrastructure that the free profile depends on: account storage, trusted traffic identity, request budgets, safe deletion, and explicit gates around paid or unapproved capabilities.</p><div><Link className="button button-lime button-large" href="/auth?mode=sign-up">Create a free account <ArrowRight /></Link><a className="button-quiet beta-link" href="https://github.com/painjanevivek/IroGuide" target="_blank" rel="noreferrer">View the repository <Github /></a></div></div><div className="diagnostics-orb"><span className="mono-label">PUBLIC SIGNAL</span><strong>/api</strong><p>Public health reveals only availability. Authorized operators can inspect configuration-safe details below.</p><small>/api/readiness</small></div></section><ReadinessDiagnostics /><section className="alpha-principles"><div><p className="eyebrow light"><ShieldCheck /> Trust before growth</p><h2>No launch theater.</h2><p>Readiness distinguishes approved free capabilities from intentionally gated AI, image-storage, email-delivery, and Community paths.</p></div><div><LockKeyhole /><h3>Fix staging first</h3><p>Use the failing rows to restore account verification, rate limiting, traffic identity, and review-text persistence before inviting testers.</p><LockKeyhole /><h3>Keep paid paths closed</h3><p>A green free launch does not require provider credentials. AI critique remains unavailable until its separate activation gate is approved.</p></div></section><section className="beta-cta"><p className="eyebrow">Explore what is ready</p><h2>Build your account.<br /><span>Keep your history private.</span></h2><Link className="button button-dark button-large" href="/auth?mode=sign-up">Create account <ArrowRight /></Link></section></main></div>; }
