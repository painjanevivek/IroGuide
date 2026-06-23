"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

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
              ? `${reviewCount} ${reviewCount === 1 ? "review is" : "reviews are"} available here, including recent saves waiting for account image sync.`
              : `${reviewCount} ${reviewCount === 1 ? "review is" : "reviews are"} loaded for this signed-in account.`}{" "}
          Uploaded source images are stored privately with their saved critique.
        </p>
      </div>
      <Link className="button-secondary" href="/profile">Manage data <ArrowRight size={15} /></Link>
    </section>
  );
}
