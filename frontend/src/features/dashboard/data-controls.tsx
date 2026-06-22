"use client";

import { useState } from "react";
import { ShieldCheck, Trash2, X } from "lucide-react";

export function DataControls({ reviewCount }: { reviewCount: number }) {
  const [confirming, setConfirming] = useState(false);
  function clearReviews() {
    localStorage.removeItem("iroguide-reviews");
    window.dispatchEvent(new Event("iroguide-storage"));
    setConfirming(false);
  }
  return <section className="data-controls"><ShieldCheck /><div><span className="mono-label">LOCAL DATA CONTROLS</span><h2>Your review history, your decision.</h2><p>This demo keeps review text in this browser only. Clear it at any time. Selected image bytes are not stored by IroGuide.</p></div>{confirming ? <div className="delete-confirm" role="group" aria-label="Confirm deletion"><p>Delete {reviewCount} local {reviewCount === 1 ? "review" : "reviews"}? This cannot be undone.</p><button className="danger-button" onClick={clearReviews}><Trash2 /> Delete local history</button><button className="button-secondary" onClick={() => setConfirming(false)}><X /> Cancel</button></div> : <button className="button-secondary" disabled={reviewCount === 0} onClick={() => setConfirming(true)}><Trash2 /> Clear local history</button>}</section>;
}
