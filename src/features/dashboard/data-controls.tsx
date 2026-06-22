"use client";

import { ShieldCheck } from "lucide-react";

export function DataControls({ reviewCount }: { reviewCount: number }) {
  return (
    <section className="data-controls">
      <ShieldCheck />
      <div>
        <span className="mono-label">FIREBASE DATA CONTROLS</span>
        <h2>Your review history follows your account.</h2>
        <p>
          {reviewCount === 0
            ? "Once you create a review, the backend will save it to Firestore under your Firebase user ID."
            : `${reviewCount} ${reviewCount === 1 ? "review is" : "reviews are"} loaded from Firestore for this signed-in account.`}{" "}
          Image bytes are not persisted by this build yet.
        </p>
      </div>
      <span className="auth-status">Deletion tools arrive with account settings.</span>
    </section>
  );
}
