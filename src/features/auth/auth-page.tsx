"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { PhoneOtpForm } from "./phone-otp-form";
import { useAuth } from "./auth-provider";

export function AuthPage() {
  const params = useSearchParams();
  const intent = params.get("mode") === "sign-up" ? "sign-up" : "sign-in";
  const { user, loading, error } = useAuth();

  if (loading) {
    return <main className="auth-gate"><LoaderCircle className="spin" /><p>Checking your IroGuide session...</p></main>;
  }

  if (user) {
    return (
      <main className="auth-gate">
        <p className="eyebrow">You are signed in</p>
        <h1>Your IroGuide workspace is ready.</h1>
        <p>Continue to your dashboard or start a new critique.</p>
        <div className="auth-actions">
          <Link className="button button-dark" href="/dashboard">Go to dashboard <ArrowRight size={17} /></Link>
          <Link className="button-secondary" href="/review/new">Start a review</Link>
        </div>
      </main>
    );
  }

  return <main className="auth-gate"><PhoneOtpForm intent={intent} setupError={error} /></main>;
}
