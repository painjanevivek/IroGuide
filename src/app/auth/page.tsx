import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPage } from "@/features/auth/auth-page";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense fallback={<main className="auth-gate"><p>Loading sign in...</p></main>}>
      <AuthPage />
    </Suspense>
  );
}
