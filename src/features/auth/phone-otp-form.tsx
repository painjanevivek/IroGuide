"use client";

import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { FormEvent, useEffect, useRef, useState } from "react";
import { LoaderCircle, Phone, ShieldCheck } from "lucide-react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

declare global {
  interface Window {
    grecaptcha?: { reset: (widgetId?: number) => void };
  }
}

type PhoneOtpFormProps = {
  intent?: "sign-in" | "sign-up";
  setupError?: string;
};

type PhoneRegion = (typeof phoneRegions)[number];

const phoneRegions = [
  { iso: "IN", country: "India", dialCode: "91", example: "9876543210" },
  { iso: "US", country: "United States", dialCode: "1", example: "5551234567" },
  { iso: "CA", country: "Canada", dialCode: "1", example: "5551234567" },
  { iso: "GB", country: "United Kingdom", dialCode: "44", example: "7400123456" },
  { iso: "AE", country: "United Arab Emirates", dialCode: "971", example: "501234567" },
  { iso: "AU", country: "Australia", dialCode: "61", example: "412345678" },
  { iso: "SG", country: "Singapore", dialCode: "65", example: "81234567" },
  { iso: "DE", country: "Germany", dialCode: "49", example: "15123456789" },
  { iso: "FR", country: "France", dialCode: "33", example: "612345678" },
  { iso: "NL", country: "Netherlands", dialCode: "31", example: "612345678" },
  { iso: "IE", country: "Ireland", dialCode: "353", example: "851234567" },
  { iso: "NZ", country: "New Zealand", dialCode: "64", example: "211234567" },
  { iso: "ZA", country: "South Africa", dialCode: "27", example: "821234567" },
  { iso: "MY", country: "Malaysia", dialCode: "60", example: "123456789" },
  { iso: "PH", country: "Philippines", dialCode: "63", example: "9123456789" },
  { iso: "ID", country: "Indonesia", dialCode: "62", example: "8123456789" },
  { iso: "JP", country: "Japan", dialCode: "81", example: "9012345678" },
  { iso: "KR", country: "South Korea", dialCode: "82", example: "1012345678" },
  { iso: "BR", country: "Brazil", dialCode: "55", example: "11987654321" },
  { iso: "MX", country: "Mexico", dialCode: "52", example: "5512345678" },
] as const;

export function PhoneOtpForm({ intent = "sign-in", setupError = "" }: PhoneOtpFormProps) {
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [regionIso, setRegionIso] = useState<PhoneRegion["iso"]>("IN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const isSignUp = intent === "sign-up";
  const selectedRegion = phoneRegions.find((region) => region.iso === regionIso) ?? phoneRegions[0];

  useEffect(() => () => {
    verifierRef.current?.clear();
    verifierRef.current = null;
  }, []);

  async function sendOtp(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setMessage("");

    const localPhoneNumber = phoneNumber.replace(/\D/g, "");
    const normalizedPhone = `+${selectedRegion.dialCode}${localPhoneNumber}`;
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setFormError(`Enter a valid ${selectedRegion.country} phone number, for example +${selectedRegion.dialCode}${selectedRegion.example}.`);
      return;
    }

    setSending(true);
    try {
      const verifier = await getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(getFirebaseClientAuth(), normalizedPhone, verifier);
      setConfirmationResult(result);
      setMessage(`OTP sent to ${normalizedPhone}. Enter the 6-digit code from the SMS.`);
    } catch (sendError) {
      await resetRecaptcha();
      setFormError(getPhoneAuthErrorMessage(sendError, selectedRegion));
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
    <>
      <ShieldCheck size={36} />
      <p className="eyebrow">Private workspace</p>
      <h1>{isSignUp ? "Create your IroGuide account with phone OTP." : "Sign in with phone OTP to save your design critiques."}</h1>
      <p>{isSignUp ? "Use your phone number to create a private workspace for reviews and progress." : "Choose your region and we'll send a one-time SMS code."}</p>

      <form className="otp-form" onSubmit={confirmationResult ? verifyOtp : sendOtp}>
        {!confirmationResult ? (
          <div className="phone-input-grid">
            <label>
              <span>Region</span>
              <select
                autoComplete="country"
                value={regionIso}
                onChange={(event) => {
                  setRegionIso(event.target.value as PhoneRegion["iso"]);
                  setFormError("");
                }}
              >
                {phoneRegions.map((region) => (
                  <option key={region.iso} value={region.iso}>
                    {region.country} (+{region.dialCode})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Phone number</span>
              <div className="phone-number-entry">
                <span>+{selectedRegion.dialCode}</span>
                <input
                  autoComplete="tel-national"
                  inputMode="tel"
                  placeholder={selectedRegion.example}
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value.replace(/[^\d\s()-]/g, ""))}
                />
              </div>
            </label>
          </div>
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
          {sending || verifying ? <><LoaderCircle className="spin" /> Please wait...</> : confirmationResult ? <>Verify OTP <ShieldCheck size={17} /></> : <>{isSignUp ? "Create account" : "Send OTP"} <Phone size={17} /></>}
        </button>

        {confirmationResult && (
          <button className="button-secondary" type="button" onClick={() => { setConfirmationResult(null); setCode(""); setMessage(""); void resetRecaptcha(); }}>
            Use a different phone number
          </button>
        )}
      </form>
    </>
  );
}

function getPhoneAuthErrorMessage(error: unknown, region: PhoneRegion) {
  const message = error instanceof Error ? error.message : "";
  const countryHint = `${region.country} (${region.iso})`;

  if (message.includes("auth/operation-not-allowed") && message.toLowerCase().includes("region")) {
    return `SMS is blocked for ${countryHint} in Firebase. Open Firebase Console > Authentication > Settings > SMS region policy, choose Allow, select ${countryHint}, then save.`;
  }

  if (message.includes("auth/operation-not-allowed")) {
    return "Phone OTP is not enabled for this Firebase project. Open Firebase Console > Authentication > Sign-in method and enable Phone.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Firebase has temporarily blocked OTP requests from this device or number. Please wait a few minutes and try again.";
  }

  if (message.includes("auth/invalid-phone-number")) {
    return `Enter a valid ${region.country} phone number, for example +${region.dialCode}${region.example}.`;
  }

  return message || "SMS could not be sent. Please try again.";
}
