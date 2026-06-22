"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Check, FileImage, LoaderCircle, RotateCcw, TrendingUp, Upload, X } from "lucide-react";
import { comparisonOutputSchema, type ComparisonOutput } from "@/domain/comparison";
import type { ReviewOutput } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";
import { postJsonWithFallback } from "@/lib/api-client";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ComparisonPanel({ review, originalPreview }: { review: ReviewOutput; originalPreview: string | null }) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comparison, setComparison] = useState<ComparisonOutput | null>(null);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function acceptFile(candidate?: File) {
    setError("");
    setComparison(null);
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) { setError("Choose a PNG, JPEG, or WebP revised image."); return; }
    if (candidate.size > MAX_SIZE) { setError("This revision is larger than the 10 MB limit."); return; }
    if (candidate.size === 0) { setError("This revision appears to be empty."); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreview = URL.createObjectURL(candidate);
    previewRef.current = nextPreview;
    setPreview(nextPreview);
    setFile(candidate);
  }

  function removeFile() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setFile(null);
    setComparison(null);
  }

  async function compareRevision() {
    if (!file || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error("Sign in again before comparing a revision.");
      const payload = await postJsonWithFallback({
        path: "/api/comparisons",
        unavailableMessage: "The comparison service is not available right now.",
        failureMessage: "Comparison failed.",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ originalReview: review, revisedFile: { name: file.name, type: file.type, size: file.size } }),
        },
      });
      setComparison(comparisonOutputSchema.parse(payload));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Comparison failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="comparison-panel">
      <div className="comparison-heading">
        <div>
          <p className="eyebrow light"><TrendingUp /> Before / after</p>
          <h2>Compare the next version.</h2>
        </div>
        <p>Upload a revised image to compare it against this critique. The original review stays intact.</p>
      </div>

      <div className="comparison-workspace">
        <div className="comparison-frames">
          <ComparisonFrame label="Original" score={review.overallScore} preview={originalPreview} />
          <ComparisonFrame label="Revised" score={comparison?.revisedScore ?? null} preview={preview} emptyText="Upload revision" />
        </div>

        <div className="revision-uploader">
          {preview && file ? (
            <div className="revision-file">
              <FileImage />
              <div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div>
              <button type="button" aria-label="Remove revised image" onClick={removeFile}><X /></button>
            </div>
          ) : (
            <div className="revision-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); acceptFile(event.dataTransfer.files?.[0]); }}>
              <Upload />
              <strong>Drop revised image</strong>
              <span>PNG, JPEG, or WebP</span>
            </div>
          )}
          <input ref={inputRef} className="sr-only" type="file" accept={ACCEPTED.join(",")} onChange={(event: ChangeEvent<HTMLInputElement>) => { acceptFile(event.target.files?.[0]); event.target.value = ""; }} />
          <div className="comparison-actions">
            <button type="button" className="button-secondary" onClick={() => inputRef.current?.click()}><RotateCcw size={16} /> {file ? "Replace revision" : "Choose revision"}</button>
            <button type="button" className="button button-lime" disabled={!file || submitting} onClick={compareRevision}>{submitting ? <><LoaderCircle className="spin" /> Comparing...</> : <>Compare version <ArrowRight size={17} /></>}</button>
          </div>
          {error && <p className="form-error" role="alert"><AlertCircle /> {error}</p>}
        </div>
      </div>

      {comparison && (
        <div className="comparison-result">
          <div className="comparison-score">
            <span className="mono-label">Score movement</span>
            <strong>{comparison.scoreDelta >= 0 ? "+" : ""}{comparison.scoreDelta}</strong>
            <p>{comparison.originalScore} to {comparison.revisedScore} / 10</p>
          </div>
          <div className="comparison-summary">
            <h3>{comparison.summary}</h3>
            <ComparisonList title="Improved" items={comparison.improved} tone="good" />
            <ComparisonList title="Still unresolved" items={comparison.remainingIssues} tone="watch" />
            <ComparisonList title="Regression check" items={comparison.regressions} tone="quiet" />
            <div className="next-action"><Check /><p>{comparison.nextAction}</p></div>
          </div>
        </div>
      )}
    </section>
  );
}

function ComparisonFrame({ label, score, preview, emptyText = "No image" }: { label: string; score: number | null; preview: string | null; emptyText?: string }) {
  return (
    <article className="comparison-frame">
      <header><span>{label}</span>{score !== null && <strong>{score}<small>/10</small></strong>}</header>
      <div>{preview ? <Image src={preview} alt={`${label} design preview`} fill unoptimized /> : <span>{emptyText}</span>}</div>
    </article>
  );
}

function ComparisonList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "watch" | "quiet" }) {
  return (
    <article className={`comparison-list tone-${tone}`}>
      <h4>{title}</h4>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </article>
  );
}
