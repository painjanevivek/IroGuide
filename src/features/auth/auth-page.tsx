"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { GoogleAuthCard } from "./google-auth-card";
import { useAuth } from "./auth-provider";
import { AuthTemplateShell } from "./auth-template-shell";
import { getSafeAuthReturnPath } from "@/domain/auth-return";

export function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("mode") === "sign-up" ? "sign-up" : "sign-in";
  const nextPath = getSafeAuthReturnPath(params.get("next"), intent === "sign-up" ? "/onboarding" : "/dashboard");
  const { user, loading, error } = useAuth();

  useEffect(() => {
    router.prefetch(nextPath);
  }, [nextPath, router]);

  useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, nextPath, router, user]);

  if (loading) {
    return <main className="auth-gate"><LoaderCircle className="spin" /><p>Checking your IroGuide session...</p></main>;
  }

  if (user) {
    const destinationLabel = nextPath.startsWith("/onboarding") ? "learning setup" : "workspace";
    return (
      <main className="auth-gate">
        <p className="eyebrow">You are signed in</p>
        <h1>Taking you to your {destinationLabel}.</h1>
        <p>Your private IroGuide account is ready.</p>
      </main>
    );
  }

  return (
    <AuthTemplateShell mode={intent}>
      <GoogleAuthCard intent={intent} nextPath={nextPath} setupError={error} />
    </AuthTemplateShell>
  );
}
