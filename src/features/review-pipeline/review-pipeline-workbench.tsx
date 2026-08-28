"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, CircleAlert, LoaderCircle, Upload } from "lucide-react";
import { feedbackModes, reviewCategories } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";
import styles from "./review-pipeline-workbench.module.css";

type Stage = "idle" | "authorizing" | "uploading" | "validating" | "queued" | "running" | "succeeded" | "failed";
type UploadProjection = { id: string; state: "authorized" | "uploaded" | "validated" | "consumed" | "expired" | "rejected"; failureClass: string | null };
type JobProjection = { id: string; status: "accepted" | "running" | "succeeded" | "failed-retryable" | "failed-permanent" | "cancelled"; resultDocumentId: string | null; failureClass: string | null };

const stages: Array<{ id: Stage; label: string }> = [
  { id: "authorizing", label: "Authorize" },
  { id: "uploading", label: "Direct upload" },
  { id: "validating", label: "Validate" },
  { id: "queued", label: "Queue" },
  { id: "running", label: "Critique" },
  { id: "succeeded", label: "Saved" },
];

export function ReviewPipelineWorkbench() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [upload, setUpload] = useState<UploadProjection | null>(null);
  const [job, setJob] = useState<JobProjection | null>(null);
  const [category, setCategory] = useState<(typeof reviewCategories)[number]>("website");
  const [mode, setMode] = useState<(typeof feedbackModes)[number]>("mentor");
  const [brief, setBrief] = useState({
    audience: "Independent designers",
    purpose: "Evaluate a portfolio interface",
    style: "Clear, editorial, and accessible",
    goal: "Make the primary action easier to understand",
    concern: "Visual hierarchy and clarity",
  });
  const jobRequestRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!user || !upload || upload.state !== "uploaded") return;
    const timer = window.setInterval(() => {
      void requestJson<UploadProjection>(`/api/review-uploads/${upload.id}`, user)
        .then((next) => {
          setUpload(next);
          if (next.state === "validated") {
            window.clearInterval(timer);
            setStage("queued");
            if (jobRequestRef.current) {
              void requestJson<{ job: JobProjection }>("/api/review-jobs", user, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(jobRequestRef.current),
              }).then((result) => setJob(result.job)).catch(fail);
            }
          } else if (next.state === "expired" || next.state === "rejected") {
            window.clearInterval(timer);
            fail(new Error(`Upload ${next.failureClass ?? next.state}.`));
          }
        })
        .catch(fail);
    }, 1_500);
    return () => window.clearInterval(timer);
  }, [upload, user]);

  useEffect(() => {
    if (!user || !job || !["accepted", "running", "failed-retryable"].includes(job.status)) return;
    const timer = window.setInterval(() => {
      void requestJson<JobProjection>(`/api/review-jobs/${job.id}`, user)
        .then((next) => {
          setJob(next);
          if (next.status === "running") setStage("running");
          if (next.status === "accepted" || next.status === "failed-retryable") setStage("queued");
          if (next.status === "succeeded") {
            setStage("succeeded");
            window.clearInterval(timer);
          }
          if (next.status === "failed-permanent" || next.status === "cancelled") {
            window.clearInterval(timer);
            fail(new Error(`Review ${next.failureClass ?? next.status}.`));
          }
        })
        .catch(fail);
    }, 1_500);
    return () => window.clearInterval(timer);
  }, [job, user]);

  function fail(caught: unknown) {
    setStage("failed");
    setError(caught instanceof Error ? caught.message : "The review pipeline stopped safely.");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !user || stage !== "idle" && stage !== "failed") return;
    setError("");
    setJob(null);
    setUpload(null);
    try {
      setStage("authorizing");
      const authorized = await requestJson<{ id: string; uploadFields: Record<string, string>; uploadMethod: "POST"; uploadUrl: string }>("/api/review-uploads", user, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      setStage("uploading");
      const uploadBody = new FormData();
      for (const [name, value] of Object.entries(authorized.uploadFields)) uploadBody.append(name, value);
      uploadBody.append("file", file);
      const directUpload = await fetch(authorized.uploadUrl, { method: authorized.uploadMethod, body: uploadBody });
      if (!directUpload.ok) throw new Error("The direct upload was rejected.");
      setStage("validating");
      const finalized = await requestJson<{ id: string; state: "uploaded" }>(`/api/review-uploads/${authorized.id}/finalize`, user, { method: "POST" });
      jobRequestRef.current = {
        uploadSessionId: authorized.id,
        idempotencyKey: crypto.randomUUID(),
        category,
        mode,
        brief,
      };
      setUpload({ ...finalized, failureClass: null });
    } catch (caught) {
      fail(caught);
    }
  }

  const activeIndex = stages.findIndex((item) => item.id === stage);
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div><p>Internal infrastructure</p><h1>Durable review pipeline</h1></div>
        <Link href="/dashboard">Exit to dashboard</Link>
      </header>
      <ol className={styles.progress} aria-label="Review progress">
        {stages.map((item, index) => (
          <li key={item.id} data-state={stage === "failed" && index === activeIndex ? "failed" : index < activeIndex || stage === "succeeded" ? "complete" : index === activeIndex ? "active" : "pending"}>
            <span>{index < activeIndex || stage === "succeeded" ? <Check size={14} /> : index + 1}</span>{item.label}
          </li>
        ))}
      </ol>
      <section className={styles.panel}>
        <div className={styles.intro}>
          <p>Owner-bound · direct-to-storage · content validated · idempotent</p>
          <h2>Exercise the inactive provider boundary.</h2>
          <span>This workbench only renders when the internal pipeline, full launch profile, and worker secret are all enabled.</span>
        </div>
        <form onSubmit={submit} className={styles.form}>
          <label className={styles.upload}>
            <Upload size={22} />
            <span><strong>{file?.name ?? "Choose a review image"}</strong><small>PNG, JPEG, or WebP · 4 MB maximum</small></span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className={styles.row}>
            <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>{reviewCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Voice<select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>{feedbackModes.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <details className={styles.details}>
            <summary>Review brief</summary>
            {Object.entries(brief).map(([key, value]) => <label key={key}>{key}<input value={value} onChange={(event) => setBrief((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
          </details>
          <button className={styles.submit} disabled={!file || !["idle", "failed"].includes(stage)}>
            {["idle", "failed"].includes(stage) ? "Start internal review" : <><LoaderCircle className={styles.spin} size={17} /> Pipeline active</>}
          </button>
        </form>
        <div className={styles.status} aria-live="polite">
          {error ? <><CircleAlert /><strong>{error}</strong></> : stage === "idle" ? <span>Waiting for a bounded image.</span> : <><LoaderCircle className={stage === "succeeded" ? "" : styles.spin} /><strong>{stage === "succeeded" ? "Review saved." : `Pipeline state: ${stage}.`}</strong></>}
          {job?.resultDocumentId && <small>Result document: {job.resultDocumentId}</small>}
        </div>
      </section>
    </main>
  );
}

async function requestJson<T>(path: string, user: NonNullable<ReturnType<typeof useAuth>["user"]>, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const response = await fetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "The pipeline request failed.");
  return payload as T;
}
