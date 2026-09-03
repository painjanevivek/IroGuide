"use client";

import type { User } from "firebase/auth";
import { CheckCircle2, LoaderCircle, MailX, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { ACTIVATION_PROGRAM_VERSION, type ReviewCategory } from "@/domain/product-activation";
import { categoryLabels, reviewCategories } from "@/domain/review";
import { recordAccessInterest, revokeAccessInterest } from "@/lib/learning-api-client";
import { captureProductEvidence } from "@/lib/product-evidence";
import type { AccountExperienceBundle } from "@/lib/account-experience-client";

export function AccessInterestTool({ bundle, onBundle, user }: { bundle: AccountExperienceBundle | null; onBundle: (bundle: AccountExperienceBundle) => void; user: User }) {
  const current = bundle?.accessInterest ?? null;
  const [preferredCategory, setPreferredCategory] = useState<ReviewCategory | null>(bundle?.experience.selectedCategories[0] ?? null);
  const [clientWorkIntent, setClientWorkIntent] = useState<"personal-only" | "client-safe-only" | "unsure">("unsure");
  const [permission, setPermission] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestAccess() {
    if (!bundle || !permission) return;
    setBusy(true);
    setError("");
    try {
      const record = await recordAccessInterest(user, {
        schemaVersion: 1,
        programVersion: ACTIVATION_PROGRAM_VERSION,
        expectedRevision: current?.revision ?? null,
        mutationId: crypto.randomUUID(),
        preferredCategory,
        clientWorkIntent,
        contactPermission: true,
      });
      onBundle({ ...bundle, accessInterest: record });
      void captureProductEvidence(user, { name: "access_interest_recorded", category: preferredCategory ?? "other", cohort: bundle.experience.primaryRole ?? "other" });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Review access interest could not be saved.");
    } finally { setBusy(false); }
  }

  async function revoke() {
    if (!bundle) return;
    setBusy(true);
    setError("");
    try {
      const record = await revokeAccessInterest(user, {
        schemaVersion: 1,
        programVersion: ACTIVATION_PROGRAM_VERSION,
        expectedRevision: current?.revision ?? null,
        mutationId: crypto.randomUUID(),
      });
      onBundle({ ...bundle, accessInterest: record });
      setPermission(false);
      void captureProductEvidence(user, { name: "access_interest_revoked", previousStatus: current?.status ?? "none" });
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Review access interest could not be revoked.");
    } finally { setBusy(false); }
  }

  if (!bundle) return <section className="learning-tool"><header><div><p className="mono-label">Invite-only critique</p><h3>Review access status is unavailable.</h3><p>Reload after private account progress is available. No request has been sent.</p></div></header></section>;

  if (current && current.status !== "revoked") {
    return <section className="learning-tool"><header><div><p className="mono-label">Invite-only critique</p><h3>Your access interest is recorded.</h3><p>This is not an invitation or a place in a paid queue. Continue free learning while the provider gate remains closed.</p></div><span>{current.status}</span></header><div className="learning-completion"><CheckCircle2 /><div><strong>Status: {current.status}</strong><p>No email is sent in the free launch profile. The current state appears in your account when you return.</p></div></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<footer><button className="danger-button" type="button" disabled={busy} onClick={() => void revoke()}>{busy ? <><LoaderCircle className="spin" /> Revoking…</> : <><XCircle /> Revoke interest now</>}</button></footer></section>;
  }

  return (
    <section className="learning-tool" aria-labelledby="access-interest-title">
      <header><div><p className="mono-label">Invite-only critique</p><h3 id="access-interest-title">Tell us whether future review access fits.</h3><p>This records categorical interest only. It does not upload a design, call a provider, charge money, reserve capacity, or send email.</p></div><span>Gate closed</span></header>
      <div className="access-interest-grid">
        <label><span>Preferred category <small>Optional</small></span><select value={preferredCategory ?? ""} onChange={(event) => setPreferredCategory((event.target.value || null) as ReviewCategory | null)}><option value="">No preference</option>{reviewCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
        <fieldset><legend>Intended work</legend><label><input checked={clientWorkIntent === "personal-only"} name="work-intent" type="radio" onChange={() => setClientWorkIntent("personal-only")} /> Personal or practice work</label><label><input checked={clientWorkIntent === "client-safe-only"} name="work-intent" type="radio" onChange={() => setClientWorkIntent("client-safe-only")} /> Client-safe work only</label><label><input checked={clientWorkIntent === "unsure"} name="work-intent" type="radio" onChange={() => setClientWorkIntent("unsure")} /> Not sure yet</label></fieldset>
      </div>
      <label className="access-permission"><input checked={permission} type="checkbox" onChange={(event) => setPermission(event.target.checked)} /><span><strong>I allow IroGuide to record this interest on my account.</strong> I can revoke it immediately. No email will be sent in the current free profile.</span></label>
      <div className="learning-boundary"><ShieldCheck /><span><strong>Provider remains off</strong> Interest cannot override quality, privacy, budget, quota, or kill-switch gates.</span><MailX /></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <footer><button className="button button-dark" type="button" disabled={!permission || busy} onClick={() => void requestAccess()}>{busy ? <><LoaderCircle className="spin" /> Saving…</> : "Record review interest"}</button></footer>
    </section>
  );
}
