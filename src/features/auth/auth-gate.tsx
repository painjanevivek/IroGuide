"use client";

import type { ReactNode } from "react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { LoaderCircle, Phone, ShieldCheck } from "lucide-react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { useAuth } from "./auth-provider";

declare global {
  interface Window {
    grecaptcha?: { reset: (widgetId?: number) => void };
  }
}

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

  if (!user) return <PhoneOtpSignIn setupError={error} />;

  return children;
}

function PhoneOtpSignIn({ setupError }: { setupError: string }) {
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => () => {
    verifierRef.current?.clear();
    verifierRef.current = null;
  }, []);

  async function sendOtp(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setMessage("");
    const normalizedPhone = phoneNumber.trim().replace(/\s+/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setFormError("Enter the phone number in international format, for example +919876543210.");
      return;
    }

    setSending(true);
    try {
      const verifier = await getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(getFirebaseClientAuth(), normalizedPhone, verifier);
      setConfirmationResult(result);
      setMessage("OTP sent. Enter the 6-digit code from the SMS.");
    } catch (sendError) {
      await resetRecaptcha();
      setFormError(sendError instanceof Error ? sendError.message : "SMS could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!confirmationResult) return;
    setFormError("");
    setVerifying(true);
    try {
      await confirmationResult.confirm(code.trim());
    } catch (verifyError) {
      setFormError(verifyError instanceof Error ? verifyError.message : "The verification code is incorrect or expired.");
    } finally {
      setVerifying(false);
    }
  }

  async function getRecaptchaVerifier() {
    if (verifierRef.current) return verifierRef.current;
    const verifier = new RecaptchaVerifier(getFirebaseClientAuth(), "phone-otp-recaptcha", {
      size: "invisible",
    });
    verifierRef.current = verifier;
    widgetIdRef.current = await verifier.render();
    return verifier;
  }

  async function resetRecaptcha() {
    if (widgetIdRef.current !== null) {
      window.grecaptcha?.reset(widgetIdRef.current);
      return;
    }
    const widgetId = await verifierRef.current?.render();
    if (widgetId !== undefined) {
      widgetIdRef.current = widgetId;
      window.grecaptcha?.reset(widgetId);
    }
  }

  return (
    <main className="auth-gate">
      <ShieldCheck size={36} />
      <p className="eyebrow">Private workspace</p>
      <h1>Sign in with phone OTP to save your design critiques.</h1>
      <p>We’ll send a one-time SMS code. Use international format with country code.</p>

      <form className="otp-form" onSubmit={confirmationResult ? verifyOtp : sendOtp}>
        {!confirmationResult ? (
          <label>
            <span>Phone number</span>
            <input
              autoComplete="tel"
              inputMode="tel"
              placeholder="+919876543210"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </label>
        ) : (
          <label>
            <span>Verification code</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
        )}

        <div id="phone-otp-recaptcha" />
        {(setupError || formError) && <p className="form-error" role="alert">{formError || setupError}</p>}
        {message && <p className="auth-success">{message}</p>}

        <button className="button button-dark" id="send-otp-button" type="submit" disabled={sending || verifying}>
          {sending || verifying ? <><LoaderCircle className="spin" /> Please wait…</> : confirmationResult ? <>Verify OTP <ShieldCheck size={17} /></> : <>Send OTP <Phone size={17} /></>}
        </button>

        {confirmationResult && (
          <button className="button-secondary" type="button" onClick={() => { setConfirmationResult(null); setCode(""); setMessage(""); void resetRecaptcha(); }}>
            Use a different phone number
          </button>
        )}
      </form>
    </main>
  );
}
