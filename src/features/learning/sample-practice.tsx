"use client";

import type { User } from "firebase/auth";
import Image from "next/image";
import { Check, Eye, LoaderCircle, RotateCcw, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { ActivationSaveNotice, type ActivationSaveState } from "@/components/activation-save-notice";
import { getSampleForRole } from "@/domain/learning";
import { ACTIVATION_SCHEMA_VERSION } from "@/domain/product-activation";
import { readGuestSampleProgress, writeGuestSampleProgress, clearGuestSampleProgress } from "@/lib/guest-sample-progress";
import { saveAccountExperience, type AccountExperienceBundle } from "@/lib/account-experience-client";
import { captureProductEvidence } from "@/lib/product-evidence";

type Progress = {
  activeFindingId: string | null;
  revealedFindingIds: string[];
  checkedActionIds: string[];
  reflectionChoice: "needs-practice" | "ready-to-apply" | "not-sure" | null;
};
const emptyProgress: Progress = { activeFindingId: null, revealedFindingIds: [], checkedActionIds: [], reflectionChoice: null };

export function SamplePractice({ bundle, onBundle, user }: { bundle: AccountExperienceBundle | null; onBundle: (bundle: AccountExperienceBundle) => void; user: User | null }) {
  const sample = useMemo(() => getSampleForRole(bundle?.experience.primaryRole), [bundle?.experience.primaryRole]);
  const stored = bundle?.sampleProgress.find((record) => record.sampleId === sample.id && record.sampleVersion === sample.version);
  const stateKey = `${user?.uid ?? "guest"}:${sample.id}:${stored?.revision ?? 0}`;

  return <SamplePracticeState bundle={bundle} key={stateKey} onBundle={onBundle} sample={sample} stored={stored} user={user} />;
}

function SamplePracticeState({ bundle, onBundle, sample, stored, user }: {
  bundle: AccountExperienceBundle | null;
  onBundle: (bundle: AccountExperienceBundle) => void;
  sample: ReturnType<typeof getSampleForRole>;
  stored: AccountExperienceBundle["sampleProgress"][number] | undefined;
  user: User | null;
}) {
  const [progress, setProgress] = useState<Progress>(() => getInitialProgress(sample.id, sample.version, stored, user));
  const [prediction, setPrediction] = useState("");
  const [saveState, setSaveState] = useState<ActivationSaveState>("idle");
  const [error, setError] = useState("");

  const activeFinding = sample.findings.find((finding) => finding.id === progress.activeFindingId) ?? sample.findings.find((finding) => progress.revealedFindingIds.includes(finding.id)) ?? null;

  async function persist(next: Progress, complete = false) {
    setProgress(next);
    setError("");
    if (!user) {
      const now = new Date().toISOString();
      const existing = readGuestSampleProgress(window.localStorage);
      writeGuestSampleProgress(window.localStorage, {
        schemaVersion: 1,
        sampleId: sample.id,
        sampleVersion: sample.version,
        ...next,
        createdAt: existing?.sampleId === sample.id ? existing.createdAt : now,
        updatedAt: now,
      });
      setSaveState("saved");
      return;
    }
    if (!bundle) {
      setSaveState("error");
      setError("Account progress is not ready. Your choices remain on this screen.");
      return;
    }
    setSaveState(navigator.onLine ? "saving" : "offline");
    if (!navigator.onLine) return;
    try {
      const nextBundle = await saveAccountExperience(user, {
        schemaVersion: ACTIVATION_SCHEMA_VERSION,
        expectedRevision: bundle.experience.revision,
        mutationId: crypto.randomUUID(),
        action: "update",
        changes: complete ? { steps: { "inspect-sample": { completed: true, completedAt: new Date().toISOString() } } } : {},
        sampleProgress: {
          expectedRevision: stored?.revision ?? null,
          sampleId: sample.id,
          sampleVersion: sample.version,
          ...next,
        },
      });
      onBundle(nextBundle);
      setSaveState("saved");
      if (complete) void captureProductEvidence(user, { name: "sample_completed", sampleId: sample.id, sampleVersion: sample.version });
    } catch (saveError) {
      setSaveState(saveError instanceof Error && "status" in saveError && saveError.status === 409 ? "conflict" : navigator.onLine ? "error" : "offline");
      setError(saveError instanceof Error ? saveError.message : "Sample progress could not be saved.");
    }
  }

  function revealPrediction() {
    const chosen = sample.findings.find((finding) => finding.id === prediction) ?? sample.findings[0];
    const revealedFindingIds = Array.from(new Set([...progress.revealedFindingIds, chosen.id]));
    void persist({ ...progress, activeFindingId: chosen.id, revealedFindingIds });
    if (user) {
      if (progress.revealedFindingIds.length === 0) void captureProductEvidence(user, { name: "sample_started", sampleId: sample.id, sampleVersion: sample.version });
      void captureProductEvidence(user, { name: "sample_finding_revealed", sampleId: sample.id, findingIndex: sample.findings.indexOf(chosen) });
    }
  }

  function revealNext() {
    const nextFinding = sample.findings.find((finding) => !progress.revealedFindingIds.includes(finding.id));
    if (nextFinding) void persist({ ...progress, activeFindingId: nextFinding.id, revealedFindingIds: [...progress.revealedFindingIds, nextFinding.id] });
  }

  function reset() {
    const next = { ...emptyProgress };
    setPrediction("");
    if (!user) {
      clearGuestSampleProgress(window.localStorage);
      setProgress(next);
      setSaveState("idle");
      return;
    }
    void persist(next);
  }

  return (
    <section className="learning-tool" aria-labelledby="sample-practice-title">
      <header><div><p className="mono-label">{sample.role.replaceAll("-", " ")} recommendation</p><h3 id="sample-practice-title">Practice with {sample.title}.</h3><p>Example critique—not an analysis of your work.</p></div><span>{progress.revealedFindingIds.length} / {sample.findings.length} findings</span></header>
      <div className="sample-practice-grid">
        <figure className="learning-image-frame compact"><Image alt={sample.alt} height={sample.height} loading="eager" sizes="(max-width: 900px) 100vw, 46vw" src={sample.asset} width={sample.width} />{sample.regions.map((region, index) => progress.revealedFindingIds.some((id) => sample.findings.find((finding) => finding.id === id)?.regionId === region.id) ? <span aria-hidden="true" className="learning-region is-visible" key={region.id} style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }}><b>{index + 1}</b></span> : null)}</figure>
        <div className="sample-practice-panel">
          <fieldset><legend>1. Predict the most useful observation</legend>{sample.findings.map((finding) => <label key={finding.id}><input checked={prediction === finding.id} name="prediction" type="radio" value={finding.id} onChange={() => setPrediction(finding.id)} /><span>{finding.what}</span></label>)}</fieldset>
          <button className="button button-dark" type="button" disabled={!prediction || saveState === "saving"} onClick={revealPrediction}><Eye /> Reveal the evidence</button>
          {activeFinding ? <article className="revealed-finding"><p className={`finding-priority priority-${activeFinding.priority}`}>{activeFinding.priority}</p><h4>{activeFinding.what}</h4><dl><div><dt>Evidence</dt><dd>{activeFinding.evidence}</dd></div><div><dt>Why</dt><dd>{activeFinding.why}</dd></div><div><dt>First action</dt><dd>{activeFinding.how}</dd></div></dl><button className={progress.checkedActionIds.includes(activeFinding.actionId) ? "button-secondary is-complete" : "button-secondary"} type="button" onClick={() => void persist({ ...progress, checkedActionIds: Array.from(new Set([...progress.checkedActionIds, activeFinding.actionId])) })}><Check /> {progress.checkedActionIds.includes(activeFinding.actionId) ? "First fix chosen" : "Choose this first fix"}</button></article> : null}
          {progress.revealedFindingIds.length > 0 && progress.revealedFindingIds.length < sample.findings.length ? <button className="button-quiet" type="button" onClick={revealNext}><Sparkles /> Reveal the next finding</button> : null}
        </div>
      </div>
      {progress.checkedActionIds.length > 0 ? <fieldset className="learning-reflection"><legend>4. What will you do next?</legend>{(["ready-to-apply", "needs-practice", "not-sure"] as const).map((choice) => <label key={choice}><input checked={progress.reflectionChoice === choice} name="reflection" type="radio" onChange={() => void persist({ ...progress, reflectionChoice: choice }, true)} /><span>{choice === "ready-to-apply" ? "Apply the first fix" : choice === "needs-practice" ? "Practice another example" : "Review the explanation again"}</span></label>)}</fieldset> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <ActivationSaveNotice state={saveState} onReload={() => window.location.reload()} onRetry={() => void persist(progress, Boolean(progress.reflectionChoice))} />
      <footer><button className="button-quiet" type="button" onClick={reset}><RotateCcw /> Reset example</button>{saveState === "saving" ? <span><LoaderCircle className="spin" /> Saving</span> : <span><Save /> {user ? "Private account progress" : "This-device progress"}</span>}</footer>
    </section>
  );
}

function getInitialProgress(sampleId: string, sampleVersion: string, stored: AccountExperienceBundle["sampleProgress"][number] | undefined, user: User | null): Progress {
  if (stored) {
    return { activeFindingId: stored.activeFindingId, revealedFindingIds: stored.revealedFindingIds, checkedActionIds: stored.checkedActionIds, reflectionChoice: stored.reflectionChoice };
  }
  if (!user && typeof window !== "undefined") {
    const guest = readGuestSampleProgress(window.localStorage);
    if (guest?.sampleId === sampleId && guest.sampleVersion === sampleVersion) {
      return { activeFindingId: guest.activeFindingId, revealedFindingIds: guest.revealedFindingIds, checkedActionIds: guest.checkedActionIds, reflectionChoice: guest.reflectionChoice };
    }
  }
  return emptyProgress;
}
