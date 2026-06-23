"use client";

import { ShieldCheck } from "lucide-react";

export function DataControls({ hasLocalFallback = false, reviewCount }: { hasLocalFallback?: boolean; reviewCount: number }) {
  return (
    <section className="data-controls">
      <ShieldCheck />
      <div>
        <span className="mono-label">PRIVATE DATA CONTROLS</span>
        <h2>Your review history stays with your workspace.</h2>
        <p>
          {reviewCount === 0
            ? "Once you create a review, it will save into this signed-in workspace."
            : hasLocalFallback
              ? `${reviewCount} ${reviewCount === 1 ? "review is" : "reviews are"} available here, including local saves waiting for Firestore sync.`
              : `${reviewCount} ${reviewCount === 1 ? "review is" : "reviews are"} loaded for this signed-in account.`}{" "}
          Image bytes are not persisted by this build yet.
        </p>
      </div>
      <span className="auth-status">Deletion tools arrive with account settings.</span>
    </section>
  );
}
