"use client";

import type { User } from "firebase/auth";
import { CheckCircle2, LoaderCircle, RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivationSaveNotice, type ActivationSaveState } from "@/components/activation-save-notice";
import { DESIGN_BRIEF_FLOW_VERSION, type ReviewCategory } from "@/domain/product-activation";
import { categoryLabels, reviewCategories } from "@/domain/review";
import { captureProductEvidence } from "@/lib/product-evidence";
import { deleteDesignBrief, listDesignBriefs, saveDesignBrief, type PublicDesignBrief } from "@/lib/learning-api-client";

type BriefValues = Pick<PublicDesignBrief, "audience" | "category" | "concern" | "constraints" | "goal" | "mode" | "purpose" | "style">;
const emptyValues: BriefValues = { audience: "", category: null, concern: "", constraints: "", goal: "", mode: "mentor", purpose: "", style: "" };

export function BriefBuilder({ user }: { user: User }) {
  const [record, setRecord] = useState<PublicDesignBrief | null>(null);
  const [values, setValues] = useState<BriefValues>(emptyValues);
  const [recordId, setRecordId] = useState(() => `brief-${crypto.randomUUID()}`);
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<ActivationSaveState>("saving");
  const [error, setError] = useState("");
  const editVersionRef = useRef(0);
  const startedEvidenceRef = useRef(false);

  useEffect(() => {
    let active = true;
    void listDesignBriefs(user).then((records) => {
      if (!active) return;
      const latest = records.find((candidate) => candidate.status === "draft" || candidate.status === "ready") ?? null;
      if (latest) {
        setRecord(latest);
        setRecordId(latest.id);
        setValues(toValues(latest));
      }
      setInitialized(true);
      setSaveState("idle");
    }).catch((loadError) => {
      if (active) { setInitialized(true); setError(loadError instanceof Error ? loadError.message : "Brief drafts could not load."); setSaveState("error"); }
    });
    return () => { active = false; };
  }, [user]);

  const isReady = Boolean(values.category && values.audience.trim() && values.purpose.trim() && values.goal.trim() && values.concern.trim());

  function update<Key extends keyof BriefValues>(key: Key, value: BriefValues[Key]) {
    editVersionRef.current += 1;
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setError("");
    if (!startedEvidenceRef.current) {
      startedEvidenceRef.current = true;
      void captureProductEvidence(user, { name: "brief_started", category: key === "category" ? (value ?? "other") as ReviewCategory : values.category ?? "other" });
    }
  }

  const persist = useCallback(async (status: "draft" | "ready") => {
    if (!navigator.onLine) { setSaveState("offline"); return null; }
    const saveVersion = editVersionRef.current;
    setSaveState("saving");
    try {
      const next = await saveDesignBrief(user, {
        schemaVersion: 1,
        id: recordId,
        expectedRevision: record?.revision ?? null,
        mutationId: crypto.randomUUID(),
        ...values,
        step: isReady ? 4 : 1,
        flowVersion: DESIGN_BRIEF_FLOW_VERSION,
        status,
      });
      setRecord(next);
      if (editVersionRef.current === saveVersion) setDirty(false);
      setSaveState("saved");
      setError("");
      return next;
    } catch (saveError) {
      const conflict = saveError instanceof Error && "status" in saveError && saveError.status === 409;
      setError(saveError instanceof Error ? saveError.message : "The brief could not be saved.");
      setSaveState(conflict ? "conflict" : navigator.onLine ? "error" : "offline");
      return null;
    }
  }, [isReady, record, recordId, user, values]);

  useEffect(() => {
    if (!initialized || !dirty) return;
    const timer = window.setTimeout(() => void persist("draft"), 800);
    return () => window.clearTimeout(timer);
  }, [dirty, initialized, persist]);

  async function markReady() {
    if (!isReady) { setError("Add the audience, purpose, goal, concern, and category before marking this brief ready."); return; }
    const next = await persist("ready");
    if (next) void captureProductEvidence(user, { name: "brief_ready", category: next.category ?? "other", constraintPresent: Boolean(next.constraints) });
  }

  async function reset() {
    setSaveState("saving");
    try {
      if (record) await deleteDesignBrief(user, record.id);
      setRecord(null);
      setRecordId(`brief-${crypto.randomUUID()}`);
      setValues(emptyValues);
      editVersionRef.current = 0;
      setDirty(false);
      setError("");
      setSaveState("idle");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "The brief could not be reset.");
      setSaveState("error");
    }
  }

  return (
    <section className="learning-tool" aria-labelledby="brief-builder-title">
      <header><div><p className="mono-label">Image-free preparation</p><h3 id="brief-builder-title">Write the context before asking for critique.</h3><p>This draft contains text only. Do not include client names, confidential details, or links.</p></div><span>{record?.status === "ready" ? "Ready" : dirty ? "Unsaved changes" : record ? "Draft saved" : "New draft"}</span></header>
      <div className="brief-form-grid">
        <label><span>Category <small>Required</small></span><select value={values.category ?? ""} onChange={(event) => update("category", (event.target.value || null) as ReviewCategory | null)}><option value="">Choose a category</option>{reviewCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
        <label><span>Guidance style</span><select value={values.mode} onChange={(event) => update("mode", event.target.value as BriefValues["mode"])}><option value="friendly">Friendly</option><option value="mentor">Mentor</option><option value="direct">Direct</option></select></label>
        <BriefField label="Audience" maxLength={240} required value={values.audience} onChange={(value) => update("audience", value)} placeholder="Who needs to understand or use this design?" />
        <BriefField label="Purpose" maxLength={400} required textarea value={values.purpose} onChange={(value) => update("purpose", value)} placeholder="What should the design help them know or do?" />
        <BriefField label="Style" maxLength={240} value={values.style} onChange={(value) => update("style", value)} placeholder="What tone or visual character is intentional?" />
        <BriefField label="Goal" maxLength={240} required value={values.goal} onChange={(value) => update("goal", value)} placeholder="What would make this version more successful?" />
        <BriefField label="Main concern" maxLength={400} required textarea value={values.concern} onChange={(value) => update("concern", value)} placeholder="What decision are you least certain about?" />
        <BriefField label="Constraints" maxLength={400} textarea value={values.constraints} onChange={(value) => update("constraints", value)} placeholder="Format, deadline, brand, accessibility, or production limits" />
      </div>
      {record?.status === "ready" ? <div className="learning-completion"><CheckCircle2 /><div><strong>Your brief is ready.</strong><p>You prepared critique context without uploading an image. Review access remains a separate gated step.</p></div></div> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <ActivationSaveNotice state={saveState} onReload={() => window.location.reload()} onRetry={() => void persist(record?.status === "ready" ? "ready" : "draft")} />
      <footer><button className="button button-dark" type="button" disabled={!isReady || saveState === "saving"} onClick={() => void markReady()}>{saveState === "saving" ? <><LoaderCircle className="spin" /> Saving…</> : <><CheckCircle2 /> Mark brief ready</>}</button><button className="button-secondary" type="button" disabled={!dirty || saveState === "saving"} onClick={() => void persist("draft")}><Save /> Save draft</button><button className="button-quiet" type="button" onClick={() => void reset()}><RotateCcw /> Reset and delete draft</button></footer>
    </section>
  );
}

function BriefField({ label, maxLength, onChange, placeholder, required = false, textarea = false, value }: { label: string; maxLength: number; onChange: (value: string) => void; placeholder: string; required?: boolean; textarea?: boolean; value: string }) {
  const control = textarea
    ? <textarea maxLength={maxLength} placeholder={placeholder} rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
    : <input maxLength={maxLength} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
  return <label><span>{label} <small>{required ? "Required" : "Optional"}</small></span>{control}<small className="field-count">{value.length} / {maxLength}</small></label>;
}

function toValues(record: PublicDesignBrief): BriefValues {
  return { audience: record.audience, category: record.category, concern: record.concern, constraints: record.constraints, goal: record.goal, mode: record.mode, purpose: record.purpose, style: record.style };
}
