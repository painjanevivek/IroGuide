"use client";

import type { User } from "firebase/auth";
import type { ProductEvidenceEventInput, ResearchFeedback } from "@/domain/product-evidence";
import { getAnalyticsConsentReceipt } from "@/lib/analytics";
import { requestJsonWithFallback } from "@/lib/api-client";
import { isE2ELocalAuthEnabled } from "@/lib/e2e-local-auth";

export async function captureProductEvidence(user: User | null, event: ProductEvidenceEventInput) {
  const consent = getAnalyticsConsentReceipt();
  if (!user || !consent || isE2ELocalAuthEnabled()) return false;

  try {
    const token = await user.getIdToken();
    await requestJsonWithFallback({
      path: "/api/product-evidence",
      unavailableMessage: "Product evidence is unavailable.",
      failureMessage: "Product evidence was not accepted.",
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-IroGuide-Analytics-Consent": `v${consent.version}`,
        },
        body: JSON.stringify({ ...event, eventId: crypto.randomUUID() }),
      },
    });
    return true;
  } catch {
    // Evidence collection must never block or change the product journey.
    return false;
  }
}

export async function submitResearchFeedback(user: User, feedback: ResearchFeedback) {
  const token = await user.getIdToken();
  return requestJsonWithFallback({
    path: "/api/research-feedback",
    unavailableMessage: "Research feedback is not available right now.",
    failureMessage: "Research feedback could not be submitted.",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ feedback, submissionId: crypto.randomUUID() }),
    },
  });
}

export async function hashEvidenceSignature(parts: Array<string | number | undefined>) {
  const input = parts.map((part) => String(part ?? "")).join("\u001f");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getReviewAgeBucket(savedAt: string) {
  const timestamp = Date.parse(savedAt);
  if (!Number.isFinite(timestamp)) return "unknown" as const;
  const days = Math.max(0, (Date.now() - timestamp) / (24 * 60 * 60 * 1_000));
  if (days < 1) return "same-day" as const;
  if (days <= 7) return "1-7-days" as const;
  if (days <= 30) return "8-30-days" as const;
  return "31-plus-days" as const;
}
