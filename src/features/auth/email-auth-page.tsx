"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "./auth-provider";

type EmailAuthPageProps = {
  mode: "sign-in" | "sign-up";
};

export function EmailAuthPage({ mode }: EmailAuthPageProps) {
  const router = useRouter();
  const { error, signInWithEmail, signUpWithEmail, user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const isSignUp = mode === "sign-up";

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [router, user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      router.replace("/dashboard");
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-gate">
      <ShieldCheck size={36} />
      <p className="eyebrow">Manual {isSignUp ? "sign up" : "sign in"}</p>
      <h1>{isSignUp ? "Create your account with email and password." : "Sign in with your email and password."}</h1>
      <p>{isSignUp ? "Use this if you prefer not to use Google. You can still switch sign-in methods later." : "Use your manual IroGuide account credentials to continue."}</p>

      <form className="email-auth-form" onSubmit={onSubmit}>
        {isSignUp && (
          <label>
            <span>Name</span>
            <input
              autoComplete="name"
              placeholder="Vivek Painjane"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        )}
        <label>
          <span>Email</span>
          <input
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={6}
            placeholder="At least 6 characters"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {(formError || error) && <p className="form-error" role="alert">{formError || error}</p>}

        <button className="button button-dark" type="submit" disabled={submitting}>
          {submitting ? <><LoaderCircle className="spin" /> Please wait...</> : <>{isSignUp ? "Create account" : "Sign in"} <Mail size={17} /></>}
        </button>

        <div className="auth-form-links">
          <Link className="button-secondary" href="/auth"><ArrowLeft size={16} /> Back to Google</Link>
          {isSignUp ? (
            <Link className="text-link" href="/auth/sign-in">Already have an account? Sign in <ArrowRight size={15} /></Link>
          ) : (
            <Link className="text-link" href="/auth/sign-up">Need an account? Sign up <ArrowRight size={15} /></Link>
          )}
        </div>
      </form>
    </main>
  );
}
