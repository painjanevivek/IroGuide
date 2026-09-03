import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthGate } from "@/features/auth/auth-gate";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { UserMenu } from "@/features/auth/user-menu";

export const metadata: Metadata = { title: "Learning setup", robots: { index: false, follow: false, nocache: true } };

export default function OnboardingPage() {
  return <div className="simple-page"><header className="simple-header"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><nav><Link href="/dashboard">Workspace</Link><UserMenu /></nav></header><AuthGate><Suspense fallback={<main className="onboarding-unavailable"><p>Loading learning setup…</p></main>}><OnboardingFlow /></Suspense></AuthGate></div>;
}
