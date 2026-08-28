"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, LifeBuoy, Settings2, ShieldCheck, Trash2 } from "lucide-react";

export function DataControls({ hasLocalFallback = false, reviewCount, sourceImageStorage }: { hasLocalFallback?: boolean; reviewCount: number; sourceImageStorage: boolean }) {
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
          {sourceImageStorage ? " Uploaded source images are stored privately with their saved critique." : " Source-image cloud storage is disabled in the free launch."}
        </p>
      </div>
      <div className="data-control-links">
        <Link href="/onboarding?mode=edit"><Settings2 /> Edit preferences</Link>
        <Link href="/learn?tool=data#practice"><BookOpenCheck /> Clear learning history</Link>
        <Link href="/profile#review-data"><Trash2 /> Delete review history</Link>
        <Link href="/profile#account-deletion"><ShieldCheck /> Account controls</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/contact"><LifeBuoy /> Support</Link>
        <Link className="button-secondary" href="/profile">Manage all data <ArrowRight size={15} /></Link>
      </div>
    </section>
  );
}
