"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { captureProductEvidence } from "@/lib/product-evidence";

const exactSearchHosts = ["bing.com", "duckduckgo.com", "search.brave.com"];

export function LandingEvidence() {
  const { user, loading } = useAuth();
  const capturedForUser = useRef("");

  useEffect(() => {
    if (loading || !user || capturedForUser.current === user.uid) return;
    capturedForUser.current = user.uid;
    void captureProductEvidence(user, { name: "landing_viewed", source: getLandingSource() });
  }, [loading, user]);

  return null;
}

function getLandingSource(): "direct" | "search" | "referral" | "unknown" {
  if (!document.referrer) return "direct";

  try {
    const referrerHost = new URL(document.referrer).hostname.toLowerCase();
    if (referrerHost === window.location.hostname.toLowerCase()) return "direct";
    const isExactSearchHost = exactSearchHosts.some((host) => referrerHost === host || referrerHost.endsWith(`.${host}`));
    const isRegionalSearchHost = /(^|\.)(google|yahoo)\.[a-z.]+$/.test(referrerHost);
    if (isExactSearchHost || isRegionalSearchHost) return "search";
    return "referral";
  } catch {
    return "unknown";
  }
}
