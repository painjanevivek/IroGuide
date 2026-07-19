"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsMeasurementId,
  hasAnalyticsConsent,
  trackEvent,
  trackPageView,
} from "@/lib/analytics";

export function AnalyticsTracker({ nonce }: { nonce?: string }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerInner nonce={nonce} />
    </Suspense>
  );
}

function AnalyticsTrackerInner({ nonce }: { nonce?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const measurementId = getAnalyticsMeasurementId();
  const [enabled, setEnabled] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const pathWithQuery = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const updateConsent = () => setEnabled(Boolean(measurementId) && hasAnalyticsConsent());
    const frame = window.requestAnimationFrame(updateConsent);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, updateConsent);
    window.addEventListener("storage", updateConsent);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, updateConsent);
      window.removeEventListener("storage", updateConsent);
    };
  }, [measurementId]);

  useEffect(() => {
    if (!enabled || !scriptReady) return;
    trackPageView(`${window.location.origin}${pathWithQuery}`);
  }, [enabled, pathWithQuery, scriptReady]);

  useEffect(() => {
    if (!enabled || !scriptReady) return;

    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-analytics-event]") : null;
      if (!target) return;
      trackEvent(target.dataset.analyticsEvent ?? "interaction", {
        label: target.dataset.analyticsLabel,
        path: window.location.pathname,
      });
    }

    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
  }, [enabled, scriptReady]);

  if (!measurementId || !enabled) return null;

  return (
    <>
      <Script nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <Script nonce={nonce} id="iroguide-analytics-init" strategy="afterInteractive" onLoad={() => setScriptReady(true)}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false, anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
