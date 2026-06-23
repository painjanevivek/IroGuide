"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "./auth-provider";
import { GoogleAuthCard } from "./google-auth-card";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <main className="auth-gate">
        <LoaderCircle className="spin" />
        <p>Checking your IroGuide session...</p>
      </main>
    );
  }

  if (!user) return <main className="auth-gate"><GoogleAuthCard nextPath={(pathname || "/dashboard") as Route} setupError={error} /></main>;

  return children;
}
