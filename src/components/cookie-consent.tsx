"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { ANALYTICS_CONSENT_EVENT, ANALYTICS_CONSENT_STORAGE_KEY } from "@/lib/analytics";

type ConsentState = "accepted" | "dismissed";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setIsVisible(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) === null);
      } catch {
        setIsVisible(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function saveConsent(state: ConsentState) {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify({
        state,
        acceptedAt: new Date().toISOString(),
        version: 1,
      }));
    } catch {
      // If browser storage is unavailable, still let the user dismiss the notice for this session.
    }
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: { state } }));
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <section className="cookie-consent" aria-label="Cookie consent notice">
      <div className="cookie-consent-icon" aria-hidden="true"><ShieldCheck size={20} /></div>
      <div className="cookie-consent-copy">
        <strong>Cookie and site data notice</strong>
        <p>
          IroGuide uses essential cookies and browser storage for sign-in, private review sync, security, saved preferences,
          and privacy-aware product analytics. We do not use advertising cookies.
        </p>
        <Link href="/privacy">Read privacy policy</Link>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="button button-lime" data-analytics-event="cookie_consent_accept" onClick={() => saveConsent("accepted")}>Accept site data</button>
        <button type="button" className="cookie-consent-dismiss" data-analytics-event="cookie_consent_dismiss" aria-label="Dismiss cookie notice" onClick={() => saveConsent("dismissed")}><X size={18} /></button>
      </div>
    </section>
  );
}
