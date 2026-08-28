"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Download, LifeBuoy, LoaderCircle, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";

export function DataControls({ hasLocalFallback = false, reviewCount, sourceImageStorage }: { hasLocalFallback?: boolean; reviewCount: number; sourceImageStorage: boolean }) {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function exportAccountData() {
    if (!user || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const response = await fetch("/api/account/export", { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ schemaVersion: 1 }) });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: unknown } | null;
        throw new Error(typeof payload?.error === "string" ? payload.error : "Account export is unavailable.");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = href;
      download.download = getExportFilename(response.headers.get("content-disposition"));
      download.click();
      URL.revokeObjectURL(href);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Account export is unavailable.");
    } finally {
      setExporting(false);
    }
  }
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
        <button type="button" onClick={exportAccountData} disabled={exporting}>{exporting ? <LoaderCircle className="spin" /> : <Download />} {exporting ? "Preparing export…" : "Download my data"}</button>
        <Link href="/privacy">Privacy</Link>
        <Link href="/contact"><LifeBuoy /> Support</Link>
        <Link className="button-secondary" href="/profile">Manage all data <ArrowRight size={15} /></Link>
        {exportError ? <p className="data-control-error" role="alert">{exportError}</p> : null}
      </div>
    </section>
  );
}

function getExportFilename(header: string | null) {
  const match = header?.match(/filename="([a-zA-Z0-9._-]+)"/);
  return match?.[1] ?? "iroguide-account-export.json";
}
