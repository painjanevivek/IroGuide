"use client";

export const ANALYTICS_CONSENT_STORAGE_KEY = "iroguide-cookie-consent-v1";
export const ANALYTICS_CONSENT_EVENT = "iroguide:analytics-consent";

type ConsentState = {
  acceptedAt?: string;
  state?: string;
  version?: number;
};

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function getAnalyticsMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsentReceipt() !== null;
}

export function getAnalyticsConsentReceipt() {
  if (typeof window === "undefined") return null;
  try {
    const rawValue = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue) as ConsentState;
    if (
      parsed.state !== "accepted"
      || parsed.version !== 1
      || typeof parsed.acceptedAt !== "string"
      || !Number.isFinite(Date.parse(parsed.acceptedAt))
    ) return null;
    return { acceptedAt: parsed.acceptedAt, version: 1 as const };
  } catch {
    return null;
  }
}

export function trackPageView(url: string, title = document.title) {
  const measurementId = getAnalyticsMeasurementId();
  if (!measurementId || !hasAnalyticsConsent() || typeof window.gtag !== "function") return;

  window.gtag("event", "page_view", {
    page_location: url,
    page_title: title,
    send_to: measurementId,
  });
}

export function trackEvent(name: string, params: AnalyticsParams = {}) {
  const measurementId = getAnalyticsMeasurementId();
  if (!measurementId || !hasAnalyticsConsent() || typeof window.gtag !== "function") return;

  window.gtag("event", normalizeEventName(name), {
    ...sanitizeAnalyticsParams(params),
    send_to: measurementId,
  });
}

function normalizeEventName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "user_event";
}

function sanitizeAnalyticsParams(params: AnalyticsParams) {
  const entries: Array<[string, string | number | boolean]> = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const normalizedKey = normalizeEventName(key);
    if (!normalizedKey) continue;
    entries.push([normalizedKey, typeof value === "string" ? value.slice(0, 120) : value]);
  }

  return Object.fromEntries(entries);
}
