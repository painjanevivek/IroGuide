"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="route-state-shell" role="alert">
      <AlertTriangle aria-hidden="true" />
      <p className="eyebrow">Something interrupted this page</p>
      <h1>Your work has not been intentionally discarded.</h1>
      <p>Try this page again. If the problem continues, return home or contact support without including private design content.</p>
      <div className="route-state-actions">
        <button className="button button-dark" type="button" onClick={reset}>Try again <RotateCcw size={17} /></button>
        <Link className="button-secondary" href="/contact">Contact support</Link>
      </div>
    </main>
  );
}
