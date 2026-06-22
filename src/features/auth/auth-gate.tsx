"use client";

import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { PhoneOtpForm } from "./phone-otp-form";
import { useAuth } from "./auth-provider";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <main className="auth-gate">
        <LoaderCircle className="spin" />
        <p>Checking your IroGuide session…</p>
      </main>
    );
  }

  if (!user) return <main className="auth-gate"><PhoneOtpForm setupError={error} /></main>;

  return children;
}
