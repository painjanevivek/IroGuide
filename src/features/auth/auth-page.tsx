"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { GoogleAuthCard } from "./google-auth-card";
import { useAuth } from "./auth-provider";

export function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("mode") === "sign-up" ? "sign-up" : "sign-in";
  const { user, loading, error } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, router, user]);

  if (loading) {
    return <main className="auth-gate"><LoaderCircle className="spin" /><p>Checking your IroGuide session...</p></main>;
  }

  if (user) {
    return (
      <main className="auth-gate">
        <p className="eyebrow">You are signed in</p>
        <h1>Taking you to your dashboard.</h1>
        <p>Your IroGuide workspace is ready.</p>
      </main>
    );
  }

  return <main className="auth-gate"><GoogleAuthCard intent={intent} nextPath="/dashboard" setupError={error} /></main>;
}
