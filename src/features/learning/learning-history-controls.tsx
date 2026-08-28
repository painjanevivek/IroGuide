"use client";

import type { User } from "firebase/auth";
import { LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { clearLearningHistory } from "@/lib/learning-api-client";

const confirmation = "CLEAR LEARNING";

export function LearningHistoryControls({ onCleared, user }: { onCleared: () => void; user: User }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function clear() {
    if (value !== confirmation) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await clearLearningHistory(user);
      setValue("");
      setMessage("Learning preferences, sample progress, self-reviews, briefs, and access interest were cleared.");
      onCleared();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Learning history could not be cleared.");
    } finally { setBusy(false); }
  }

  return <section className="learning-tool" aria-labelledby="learning-history-title"><header><div><p className="mono-label">Private data control</p><h3 id="learning-history-title">Clear learning history.</h3><p>This removes onboarding preferences, sample progress, self-reviews, image-free briefs, and review-access interest. It does not delete critique history or your account.</p></div><ShieldAlert /></header><label className="learning-danger-label"><span>Type {confirmation}</span><input autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}<footer><button className="danger-button" type="button" disabled={busy || value !== confirmation} onClick={() => void clear()}>{busy ? <><LoaderCircle className="spin" /> Clearing…</> : <><Trash2 /> Clear learning history</>}</button></footer></section>;
}
