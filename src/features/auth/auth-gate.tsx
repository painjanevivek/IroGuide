"use client";

import type { ReactNode } from "react";
import { LogIn, LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "./auth-provider";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, error, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <main className="auth-gate">
        <LoaderCircle className="spin" />
        <p>Checking your IroGuide session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-gate">
        <ShieldCheck size={36} />
        <p className="eyebrow">Private workspace</p>
        <h1>Sign in to review and save your design critiques.</h1>
        <p>Your reviews are attached to your Firebase account instead of this browser.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-dark" type="button" onClick={() => void signInWithGoogle()}>
          Continue with Google <LogIn size={17} />
        </button>
      </main>
    );
  }

  return children;
}
