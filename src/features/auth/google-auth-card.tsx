"use client";

import Link from "next/link";
import { LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth-provider";

type GoogleAuthCardProps = {
  intent?: "sign-in" | "sign-up";
  setupError?: string;
};

export function GoogleAuthCard({ intent = "sign-in", setupError = "" }: GoogleAuthCardProps) {
  const { signInWithGoogle, error } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const isSignUp = intent === "sign-up";
  const visibleError = error || setupError;

  async function onGoogleClick() {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ShieldCheck size={36} />
      <p className="eyebrow">Private workspace</p>
      <h1>{isSignUp ? "Create your IroGuide account with Google." : "Sign in with Google to save your design critiques."}</h1>
      <p>Use your Google account for a faster login. Your reviews stay private inside your IroGuide workspace.</p>

      <div className="google-auth-card">
        {visibleError && <p className="form-error" role="alert">{visibleError}</p>}
        <button className="button button-dark google-button" type="button" onClick={() => void onGoogleClick()} disabled={submitting}>
          {submitting ? <><LoaderCircle className="spin" /> Redirecting to Google...</> : <><GoogleMark /> Continue with Google</>}
        </button>
        <Link className="button-secondary" href={isSignUp ? "/auth/sign-up" : "/auth/sign-in"}>
          {isSignUp ? "Sign up manually with email" : "Sign in manually with email"}
        </Link>
        <p className="auth-note"><Sparkles size={14} /> Fast access with your existing Google account.</p>
      </div>
    </>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.6-2.5L15.4 17c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.7 19.7 8.1 22 12 22z" />
      <path fill="#FBBC05" d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.4l3.3-2.6z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.1 2 4.7 4.3 3.1 7.6l3.3 2.6c.8-2.3 3-4.1 5.6-4.1z" />
    </svg>
  );
}
