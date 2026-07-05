"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { AuthTemplateShell } from "./auth-template-shell";

type EmailAuthPageProps = {
  mode: "sign-in" | "sign-up";
};

const AUTH_ATTEMPT_LIMIT = 5;
const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_LOCKOUT_MS = 10 * 60 * 1000;
const AUTH_ATTEMPT_STORAGE_PREFIX = "iroguide-auth-attempts-v1";
const RESET_ATTEMPT_LIMIT = 3;
const RESET_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const RESET_LOCKOUT_MS = 30 * 60 * 1000;
const PASSWORD_RESET_SUCCESS_MESSAGE = "If an IroGuide account exists for that email, a reset link has been sent.";

type AuthRateLimitMode = EmailAuthPageProps["mode"] | "password-reset";

type AuthAttemptRecord = {
  attempts: number[];
  lockedUntil?: number;
};

export function EmailAuthPage({ mode }: EmailAuthPageProps) {
  const router = useRouter();
  const { error, resetPassword, signInWithEmail, signUpWithEmail, user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
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
    setFormSuccess("");
    const rateLimit = getAuthAttemptStatus(mode, email);
    if (rateLimit.blocked) {
      setFormError(rateLimit.message);
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      clearAuthAttempts(mode, email);
      router.replace("/dashboard");
    } catch (submitError) {
      const failureLimit = recordAuthFailure(mode, email);
      setFormError(failureLimit.blocked ? failureLimit.message : submitError instanceof Error ? submitError.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onResetPassword() {
    setFormError("");
    setFormSuccess("");
    if (isSignUp) return;
    if (!email.trim()) {
      setFormError("Enter your email before requesting a password reset.");
      return;
    }

    const rateLimit = getAuthAttemptStatus("password-reset", email);
    if (rateLimit.blocked) {
      setFormError(rateLimit.message);
      return;
    }

    setResetSubmitting(true);
    try {
      await resetPassword(email);
      recordAuthFailure("password-reset", email);
      setFormSuccess(PASSWORD_RESET_SUCCESS_MESSAGE);
    } catch (resetError) {
      const failureLimit = recordAuthFailure("password-reset", email);
      const message = resetError instanceof Error ? resetError.message : "Password reset is unavailable right now.";
      setFormError(failureLimit.blocked ? failureLimit.message : getPasswordResetErrorMessage(message));
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <AuthTemplateShell mode={mode}>
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
        {formSuccess && <p className="form-success" role="status">{formSuccess}</p>}
        {!isSignUp && <p className="auth-rate-note">For security, repeated failed sign-in attempts are temporarily rate limited.</p>}

        <button className="button button-dark" type="submit" data-analytics-event={isSignUp ? "auth_email_signup_submit" : "auth_email_signin_submit"} disabled={submitting}>
          {submitting ? <><LoaderCircle className="spin" /> Please wait...</> : <>{isSignUp ? "Create account" : "Sign in"} <Mail size={17} /></>}
        </button>

        {!isSignUp && (
          <button className="auth-reset-button" type="button" data-analytics-event="auth_password_reset_request" disabled={submitting || resetSubmitting} onClick={() => void onResetPassword()}>
            {resetSubmitting ? "Sending reset link..." : "Forgot password? Send reset link"}
          </button>
        )}

        <div className="auth-form-links">
          <Link className="button-secondary" href="/auth"><ArrowLeft size={16} /> Back to Google</Link>
          {isSignUp ? (
            <Link className="text-link" href="/auth/sign-in">Already have an account? Sign in <ArrowRight size={15} /></Link>
          ) : (
            <Link className="text-link" href="/auth/sign-up">Need an account? Sign up <ArrowRight size={15} /></Link>
          )}
        </div>
      </form>
    </AuthTemplateShell>
  );
}

function getAuthAttemptStatus(mode: AuthRateLimitMode, email: string, now = Date.now()) {
  const record = readAuthAttemptRecord(getAuthAttemptStorageKey(mode, email));
  if (record.lockedUntil && record.lockedUntil > now) {
    return { blocked: true, message: getAuthLockoutMessage(record.lockedUntil, now) };
  }

  return { blocked: false, message: "" };
}

function recordAuthFailure(mode: AuthRateLimitMode, email: string, now = Date.now()) {
  const storageKey = getAuthAttemptStorageKey(mode, email);
  const currentRecord = readAuthAttemptRecord(storageKey);
  const windowMs = mode === "password-reset" ? RESET_ATTEMPT_WINDOW_MS : AUTH_ATTEMPT_WINDOW_MS;
  const limit = mode === "password-reset" ? RESET_ATTEMPT_LIMIT : AUTH_ATTEMPT_LIMIT;
  const lockoutMs = mode === "password-reset" ? RESET_LOCKOUT_MS : AUTH_LOCKOUT_MS;
  const attempts = [...currentRecord.attempts.filter((attemptedAt) => now - attemptedAt < windowMs), now];
  const lockedUntil = attempts.length >= limit ? now + lockoutMs : undefined;
  writeAuthAttemptRecord(storageKey, { attempts, lockedUntil });

  if (!lockedUntil) return { blocked: false, message: "" };
  return { blocked: true, message: getAuthLockoutMessage(lockedUntil, now) };
}

function clearAuthAttempts(mode: AuthRateLimitMode, email: string) {
  try {
    window.localStorage.removeItem(getAuthAttemptStorageKey(mode, email));
  } catch {
    // Local throttling is defense in depth; Firebase still enforces provider-side protections.
  }
}

function readAuthAttemptRecord(storageKey: string): AuthAttemptRecord {
  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) return { attempts: [] };
    const parsed = JSON.parse(rawValue) as Partial<AuthAttemptRecord>;
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts.filter((value): value is number => typeof value === "number") : [],
      lockedUntil: typeof parsed.lockedUntil === "number" ? parsed.lockedUntil : undefined,
    };
  } catch {
    return { attempts: [] };
  }
}

function writeAuthAttemptRecord(storageKey: string, record: AuthAttemptRecord) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(record));
  } catch {
    // If browser storage is blocked, do not break sign-in; Firebase remains the source of truth.
  }
}

function getAuthAttemptStorageKey(mode: AuthRateLimitMode, email: string) {
  return `${AUTH_ATTEMPT_STORAGE_PREFIX}:${mode}:${hashAuthIdentifier(email.trim().toLowerCase())}`;
}

function hashAuthIdentifier(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function getAuthLockoutMessage(lockedUntil: number, now: number) {
  const minutes = Math.max(1, Math.ceil((lockedUntil - now) / 60_000));
  return `Too many failed attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

function getPasswordResetErrorMessage(message: string) {
  if (message.includes("Enter a valid email address")) return message;
  if (message.includes("not enabled")) return "Password reset is not enabled for this Firebase project.";
  return PASSWORD_RESET_SUCCESS_MESSAGE;
}
