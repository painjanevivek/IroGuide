"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, FileImage, LockKeyhole, RotateCcw, Save, Sparkles, Upload, X } from "lucide-react";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { AnimatedScoreBar } from "@/components/motion/animated-score-bar";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { StepTransition } from "@/components/motion/step-transition";
import { reviewDraftSchema } from "@/domain/review-draft";
import { getAnnotationIssueId } from "@/domain/review-annotations";
import type { FixFirstAction } from "@/domain/review-priority";
import { getFixFirstAction } from "@/domain/review-priority";
import { categoryLabels, feedbackModes, reviewBriefSchema, reviewCategories, reviewCreateResponseSchema, reviewOutputSchema, type ReviewCategory, type ReviewOutput } from "@/domain/review";
import { reviewSyncResponseSchema } from "@/domain/review-storage";
import { useAuth } from "@/features/auth/auth-provider";
import { postFormDataWithFallback, postJsonWithFallback } from "@/lib/api-client";
import { getFirebaseClientFirestore } from "@/lib/firebase/client";
import { cacheReviewDocument, createStoredReviewDocument } from "@/lib/review-persistence";
import { AnalysisStageDisplay } from "./analysis-stage-display";
import { AnnotationOverlay } from "./annotation-overlay";
import { ComparisonPanel } from "./comparison-panel";
import { FollowUpChat } from "./follow-up-chat";
import { ImprovementPanel } from "./improvement-panel";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
type Step = 1 | 2 | 3 | 4;
type DragState = "idle" | "accept" | "reject";
type ReviewSaveState = "idle" | "saving" | "saved" | "local";

const stepLabels = ["Upload", "Design brief", "Feedback mode", "Confirm"] as const;
const stepSummaries = ["Choose one design image", "Tell us what success means", "Choose your critic", "Review the details"] as const;
const STEP_FOCUS_DELAY_MS = 340;
const DRAFT_SAVE_DELAY_MS = 800;

const modeCopy = {
  friendly: ["Friendly", "Simple, encouraging, and educational."],
  mentor: ["Mentor", "Professional, detailed, and balanced."],
  direct: ["Direct", "Sharp and honest, never personal."],
} as const;

export function ReviewStudio() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigatedRef = useRef(false);
  const hasLoadedDraftRef = useRef(false);
  const previewRef = useRef<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [dragState, setDragState] = useState<DragState>("idle");
  const [category, setCategory] = useState<(typeof reviewCategories)[number]>("website");
  const [mode, setMode] = useState<(typeof feedbackModes)[number]>("mentor");
  const [brief, setBrief] = useState({ audience: "", purpose: "", style: "", goal: "", concern: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [review, setReview] = useState<ReviewOutput | null>(null);
  const [resultSaveState, setResultSaveState] = useState<ReviewSaveState>("idle");
  const [resultSaveError, setResultSaveError] = useState("");
  const [draftStatus, setDraftStatus] = useState("Draft will save to dashboard");

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  useEffect(() => {
    if (!hasNavigatedRef.current) return;
    const focusTimer = window.setTimeout(() => stepHeadingRef.current?.focus(), STEP_FOCUS_DELAY_MS);

    return () => window.clearTimeout(focusTimer);
  }, [step]);

  useEffect(() => {
    if (!user || hasLoadedDraftRef.current) return;
    let active = true;
    hasLoadedDraftRef.current = true;

    void getDoc(doc(getFirebaseClientFirestore(), "reviewDrafts", getActiveReviewDraftId(user.uid)))
      .then((snapshot) => {
        if (!active || !snapshot.exists()) return;
        const parsed = reviewDraftSchema.safeParse(snapshot.data());
        if (!parsed.success) return;
        const restoredDraft = parsed.data;
        if (file || hasBriefContent(brief)) return;
        hasNavigatedRef.current = true;
        setCategory(restoredDraft.category);
        setMode(restoredDraft.mode);
        setBrief(restoredDraft.brief);
        setStep(restoredDraft.step);
        setUploadStatus(restoredDraft.file ? `${restoredDraft.file.name} was restored as draft context. Reselect the image before starting critique.` : "Draft details restored.");
        setDraftStatus("Draft restored from dashboard");
      })
      .catch(() => {
        if (active) setDraftStatus("Draft saving will retry as you edit");
      });

    return () => {
      active = false;
    };
  }, [brief, file, user]);

  useEffect(() => {
    if (!user || review || !hasDraftContent({ brief, category, file, mode, step })) return;
    const timeout = window.setTimeout(() => {
      const parsed = reviewDraftSchema.safeParse({
        userId: user.uid,
        status: "draft",
        step,
        category,
        mode,
        file: file ? { name: file.name, type: file.type, size: file.size } : undefined,
        brief,
      });
      if (!parsed.success) return;

      setDraftStatus("Saving draft...");
      void setDoc(doc(getFirebaseClientFirestore(), "reviewDrafts", getActiveReviewDraftId(user.uid)), {
        ...parsed.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true })
        .then(() => setDraftStatus("Draft saved to dashboard"))
        .catch(() => setDraftStatus("Draft save will retry"));
    }, DRAFT_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [brief, category, file, mode, review, step, user]);

  function goToStep(nextStep: Step) {
    if (nextStep === step) return;
    hasNavigatedRef.current = true;
    setStepDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  }

  function getDragState(event: DragEvent<HTMLDivElement>): DragState {
    const item = event.dataTransfer.items?.[0];
    if (!item) return "accept";
    if (item.kind !== "file") return "reject";

    return !item.type || ACCEPTED.includes(item.type) ? "accept" : "reject";
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragState(getDragState(event));
  }

  function acceptFile(candidate?: File) {
    setFileError("");
    setSubmitError("");
    setUploadStatus("");
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) { setFileError("Choose a PNG, JPEG, or WebP image."); return; }
    if (candidate.size > MAX_SIZE) { setFileError("This file is larger than the 10 MB limit."); return; }
    if (candidate.size === 0) { setFileError("This file appears to be empty."); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreview = URL.createObjectURL(candidate);
    previewRef.current = nextPreview;
    setPreview(nextPreview);
    setFile(candidate);
    setUploadStatus(`${candidate.name} is ready for critique.`);
  }

  function removeFile() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setFile(null);
    setUploadStatus("Selected image removed.");
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) { acceptFile(event.target.files?.[0]); event.target.value = ""; }
  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragState("idle"); acceptFile(event.dataTransfer.files?.[0]); }
  const briefValidation = reviewBriefSchema.safeParse(brief);
  const briefValid = briefValidation.success;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!file) {
      setSubmitError("Choose a PNG, JPEG, or WebP image before starting a critique.");
      goToStep(1);
      return;
    }
    if (!briefValidation.success) {
      setSubmitError(getBriefValidationMessage(briefValidation.error.issues[0]?.path[0]));
      goToStep(2);
      return;
    }
    setSubmitting(true); setSubmitError("");
    try {
      const currentUser = user;
      const idToken = await currentUser?.getIdToken();
      if (!currentUser || !idToken) throw new Error("Sign in again before starting a critique.");
      const body = new FormData();
      body.append("category", category);
      body.append("mode", mode);
      body.append("brief", JSON.stringify(briefValidation.data));
      body.append("image", file);

      const payload = await postFormDataWithFallback({
        path: "/api/reviews",
        unavailableMessage: "The review service is not available right now.",
        failureMessage: "Review failed.",
        init: {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
          body,
        },
      });
      const reviewResponse = parseReviewCreatePayload(payload);
      const parsed = reviewResponse.review;
      setResultSaveState("saving");
      setResultSaveError("");
      try {
        const saveResult = cacheCompletedReviewForDashboard(currentUser.uid, parsed, category, reviewResponse.persistence.savedToAccount);
        void deleteActiveReviewDraft(currentUser.uid);
        setResultSaveState(saveResult.syncedToCloud ? "saved" : "local");
        setResultSaveError(saveResult.message ?? "");
      } catch (saveError) {
        setResultSaveState("idle");
        setResultSaveError(saveError instanceof Error ? saveError.message : "The critique was created, but it could not be saved to your dashboard yet.");
      }
      setReview(parsed);
    } catch (error) { setSubmitError(error instanceof Error ? error.message : "Review failed. Please try again."); }
    finally { setSubmitting(false); }
  }

  if (review) return <ReviewResult review={review} preview={preview} category={category} initialSaveState={resultSaveState} initialSaveError={resultSaveError} onRestart={() => { setReview(null); setStep(1); }} />;

  return (
    <main className="studio-shell">
      <header className="studio-header"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><div><span className="draft-status"><Check size={13} /> {draftStatus}</span><Link href="/dashboard">Dashboard</Link></div></header>
      <form className="studio-layout" onSubmit={submit}>
        <aside className="studio-sidebar">
          <Link href="/" className="back-link"><ArrowLeft size={16} /> Back home</Link>
          <p className="eyebrow light">New critique</p><h1>Let&apos;s see the<br />work in context.</h1>
          <ol className="step-list">
            {stepLabels.map((label, index) => {
              const targetStep = (index + 1) as Step;
              const isActive = step === targetStep;
              const isComplete = step > targetStep;

              return (
                <li key={label} className={isActive ? "active" : isComplete ? "complete" : ""}>
                  <button type="button" aria-current={isActive ? "step" : undefined} disabled={targetStep > step} onClick={() => goToStep(targetStep)}>
                    <span>{isComplete ? <Check size={14} /> : index + 1}</span>{label}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="privacy-note"><LockKeyhole size={18} /><div><strong>Private by default</strong><p>Signed in as {user?.email ?? "your Firebase account"}.</p></div></div>
        </aside>

        <section className="studio-workspace">
          <div className="workspace-top" aria-live="polite"><span className="mono-label">STEP {step} / 4</span><span>{stepSummaries[step - 1]}</span></div>
          <StepTransition direction={stepDirection} stepKey={step}>
          {step === 1 && <div className="form-panel"><div className="panel-heading"><span>01</span><div><h2 ref={stepHeadingRef} tabIndex={-1}>Upload your design</h2><p>We&apos;ll use your brief to critique it—not judge it in a vacuum.</p></div></div>{preview && file ? <div className="upload-preview"><div className="preview-media"><Image src={preview} alt="Selected design preview" fill unoptimized /></div><div className="file-meta"><FileImage /><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.replace("image/", "").toUpperCase()}</span></div><button type="button" aria-label="Remove selected image" onClick={removeFile}><X /></button></div><button type="button" className="button-secondary" onClick={() => inputRef.current?.click()}><RotateCcw size={16} /> Replace image</button></div> : <div className="drop-zone" data-drag-state={dragState} onDragEnter={onDragOver} onDragOver={onDragOver} onDragLeave={() => setDragState("idle")} onDrop={onDrop}><div className="upload-icon"><Upload /></div><h3>{dragState === "reject" ? "This file type is not supported" : dragState === "accept" ? "Release to add this design" : "Drop your design here"}</h3><p>{dragState === "reject" ? "Use a PNG, JPEG, or WebP image." : "or choose a file from your device"}</p><button type="button" className="button button-dark" onClick={() => inputRef.current?.click()}>Browse files</button><span>PNG, JPEG, or WebP · 10 MB maximum</span></div>}<input ref={inputRef} className="sr-only" type="file" accept={ACCEPTED.join(",")} onChange={onInput} />{uploadStatus && <p className="upload-status" role="status" aria-live="polite"><Check size={16} /> {uploadStatus}</p>}{fileError && <p className="form-error" role="alert"><AlertCircle /> {fileError}</p>}{submitError && !file && <p className="form-error" role="alert"><AlertCircle /> {submitError}</p>}<div className="panel-actions"><span /><button type="button" className="button" disabled={!file} onClick={() => goToStep(2)}>Continue <ArrowRight size={17} /></button></div></div>}

          {step === 2 && <div className="form-panel"><div className="panel-heading"><span>02</span><div><h2 ref={stepHeadingRef} tabIndex={-1}>Give us the brief</h2><p>A good critique depends on audience, purpose, and intent.</p></div></div><fieldset className="category-field"><legend>Design category</legend><div className="category-grid">{reviewCategories.map((item) => <label key={item}><input type="radio" name="category" checked={category === item} onChange={() => setCategory(item)} /><span>{categoryLabels[item]}</span></label>)}</div></fieldset><div className="field-grid">{([['audience','Target audience','e.g. Independent designers aged 22–35'],['purpose','Purpose','e.g. Launch a creative conference'],['style','Style direction','e.g. Bold, editorial, energetic'],['goal','Primary goal','e.g. Drive early-bird registrations']] as const).map(([key,label,placeholder]) => <label className="field" key={key}><span>{label} <b>Required</b></span><textarea rows={2} value={brief[key]} placeholder={placeholder} onChange={(event) => { setSubmitError(""); setBrief({...brief, [key]: event.target.value}); }} required /></label>)}</div><label className="field"><span>Specific concern <em>Optional</em></span><textarea rows={3} value={brief.concern} placeholder="What already feels unresolved?" onChange={(event) => { setSubmitError(""); setBrief({...brief, concern: event.target.value}); }} /></label>{submitError && !briefValid && <p className="form-error" role="alert"><AlertCircle /> {submitError}</p>}<div className="panel-actions"><button type="button" className="button-secondary" onClick={() => goToStep(1)}><ArrowLeft size={16} /> Back</button><button type="button" className="button" disabled={!briefValid} onClick={() => goToStep(3)}>Choose feedback <ArrowRight size={17} /></button></div></div>}

          {step === 3 && <div className="form-panel"><div className="panel-heading"><span>03</span><div><h2 ref={stepHeadingRef} tabIndex={-1}>How should we talk?</h2><p>The standards stay consistent. You choose the voice.</p></div></div><div className="mode-selector">{feedbackModes.map((item, index) => <label key={item} className={`select-mode mode-${item}`}><input type="radio" name="mode" checked={mode === item} onChange={() => setMode(item)} /><span className="mode-index">0{index + 1}</span><MessageIcon mode={item} /><div><h3>{modeCopy[item][0]}</h3><p>{modeCopy[item][1]}</p><blockquote>“{item === 'friendly' ? 'Let’s make the main message easier to notice.' : item === 'mentor' ? 'The hierarchy needs a more deliberate first reading point.' : 'The hierarchy is unresolved. Fix it before adding anything else.'}”</blockquote></div><span className="radio-mark"><Check /></span></label>)}</div><div className="panel-actions"><button type="button" className="button-secondary" onClick={() => goToStep(2)}><ArrowLeft size={16} /> Back</button><button type="button" className="button" onClick={() => goToStep(4)}>Review details <ArrowRight size={17} /></button></div></div>}

          {step === 4 && <div className="form-panel"><div className="panel-heading"><span>04</span><div><h2 ref={stepHeadingRef} tabIndex={-1}>Ready for critique</h2><p>Confirm the context. You can still go back and change anything.</p></div></div><div className="confirmation">{preview && <div className="confirm-image"><Image src={preview} alt="Design ready for review" fill unoptimized /></div>}<div className="confirm-details"><div><span>Category</span><strong>{categoryLabels[category]}</strong></div><div><span>Feedback</span><strong>{modeCopy[mode][0]}</strong></div><div><span>Audience</span><strong>{brief.audience}</strong></div><div><span>Goal</span><strong>{brief.goal}</strong></div></div></div><div className="demo-disclosure"><Sparkles /><div><strong>Authenticated vision review</strong><p>Your signed-in session is checked before the uploaded image pixels and brief are sent for structured critique. The finished review can be saved to your dashboard.</p></div></div>{submitting && <AnalysisStageDisplay />}{submitError && <p className="form-error" role="alert"><AlertCircle /> {submitError}</p>}<div className="panel-actions"><button type="button" className="button-secondary" onClick={() => goToStep(3)} disabled={submitting}><ArrowLeft size={16} /> Back</button><button type="submit" className="button button-review" disabled={submitting}>{submitting ? <>Critique in progress <Sparkles size={17} /></> : <>Start critique <Sparkles size={17} /></>}</button></div></div>}
          </StepTransition>
        </section>
      </form>
    </main>
  );
}

function MessageIcon({ mode }: { mode: (typeof feedbackModes)[number] }) { return <span className="message-glyph" aria-hidden="true">{mode === "friendly" ? "○" : mode === "mentor" ? "⌗" : "↗"}</span>; }

function ReviewResult({ review, preview, category, initialSaveState, initialSaveError, onRestart }: { review: ReviewOutput; preview: string | null; category: ReviewCategory; initialSaveState: ReviewSaveState; initialSaveError: string; onRestart: () => void }) {
  const { user } = useAuth();
  const [checked, setChecked] = useState<number[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<ReviewSaveState>(initialSaveState);
  const [saveError, setSaveError] = useState(initialSaveError);
  const fixFirst = getFixFirstAction(review);
  const providerLabel = review.provider === "live" ? "Live critique" : "Structured critique";

  async function saveReview() {
    if (saveState === "saving") return;
    const currentUser = user;
    if (!currentUser) {
      setSaveError("Sign in again before saving this review.");
      return;
    }

    setSaveState("saving");
    setSaveError("");
    try {
      const saveResult = await syncCompletedReviewToAccount(await currentUser.getIdToken(), currentUser.uid, review, category);
      void deleteActiveReviewDraft(currentUser.uid);
      setSaveState(saveResult.syncedToCloud ? "saved" : "local");
      setSaveError(saveResult.message ?? "");
    } catch (error) {
      setSaveState("idle");
      setSaveError(error instanceof Error ? error.message : "Could not save this review. Please try again.");
    }
  }

  return (
    <main className="result-shell">
      <header className="studio-header dark">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <div className="result-header-actions">
          <span className={`review-provider-badge is-${review.provider}`}>{providerLabel}</span>
          <button type="button" className="button button-lime button-small header-save-button" onClick={saveReview} disabled={saveState === "saving" || saveState === "saved"}>
            {saveState === "saved" ? <><Check size={14} /> Saved to dashboard</> : saveState === "local" ? <><Save size={14} /> Retry account sync</> : saveState === "saving" ? <>Saving...</> : <><Save size={14} /> Retry save</>}
          </button>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </header>
      <div className="result-layout">
        <aside className="result-preview">
          <button className="back-link light-button" onClick={onRestart}><ArrowLeft /> New review</button>
          {preview && (
            <div className="result-image">
              <Image src={preview} alt="Reviewed design" fill unoptimized />
              <AnnotationOverlay review={review} activeIssueId={activeIssueId} onActiveIssueChange={setActiveIssueId} />
            </div>
          )}
          <div className="preview-caption"><span className="mono-label">SOURCE DESIGN</span><p>Private · Local preview</p></div>
        </aside>
        <section className="result-content">
          <Reveal>
            <div className="result-hero">
              <div>
                <p className="eyebrow">Your critique is ready</p>
                <h1>{review.summary.split(".")[0]}.</h1>
                <p>{review.summary}</p>
              </div>
              <div className="result-score"><span className="mono-label">OVERALL</span><strong>{review.overallScore}<small>/ 10</small></strong><span>A useful baseline</span></div>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            {review.provider === "live" ? (
              <div className="demo-warning live-warning"><Check /><p><strong>Live vision critique:</strong> this result came from the configured vision provider.</p></div>
            ) : (
              <div className="demo-warning"><AlertCircle /><p><strong>Local demo mode:</strong> this fallback critique is deterministic and should only be used when production vision credentials are not configured.</p></div>
            )}
          </Reveal>
          {saveError && <div className={`save-warning${saveState === "local" ? " save-warning-info" : ""}`} role={saveState === "local" ? "status" : "alert"}><AlertCircle /> <p>{saveError}</p></div>}
          {fixFirst && <Reveal delay={0.08}><FixThisFirstCard action={fixFirst} /></Reveal>}
          <Reveal delay={0.1}>
            <section className="result-section">
              <div className="result-section-title"><span>01</span><div><p className="eyebrow">What is working</p><h2>Keep these decisions.</h2></div></div>
              <ul className="strength-list">{review.strengths.map((item) => <li key={item}><Check />{item}</li>)}</ul>
            </section>
          </Reveal>
          <Reveal delay={0.12}>
            <section className="result-section">
              <div className="result-section-title"><span>02</span><div><p className="eyebrow">Score map</p><h2>Where to focus.</h2></div></div>
              <div className="result-scores">{review.scores.map((item) => <div key={item.label}><span>{item.label}</span><i><AnimatedScoreBar value={item.score} /></i><strong>{item.score}</strong></div>)}</div>
            </section>
          </Reveal>
          <Reveal delay={0.14}>
            <section className="result-section">
              <div className="result-section-title"><span>03</span><div><p className="eyebrow">Priority critique</p><h2>What, why, and how.</h2></div></div>
              <Stagger className="issue-list">
                {review.issues.map((issue, index) => {
                  const issueId = getAnnotationIssueId(issue, index);

                  return (
                    <StaggerItem key={issue.id ?? issue.category}>
                      <article
                        id={`review-${issueId}`}
                        tabIndex={0}
                        className={`issue-card priority-${issue.priority}${activeIssueId === issueId ? " is-active" : ""}`}
                        onFocus={() => setActiveIssueId(issueId)}
                        onBlur={() => setActiveIssueId(null)}
                        onMouseEnter={() => setActiveIssueId(issueId)}
                        onMouseLeave={() => setActiveIssueId(null)}
                      >
                        <header><span>{String(index + 1).padStart(2, "0")}</span><div><p>{issue.category}</p><strong>{issue.score}/10</strong></div><b>{issue.priority} priority</b></header>
                        <div><h3>What we see</h3><p>{issue.observation}</p><h3>Why it matters</h3><p>{issue.impact}</p><h3>How to improve</h3><p>{issue.recommendation}</p><ul>{issue.actions.map((action) => <li key={action}>{action}</li>)}</ul></div>
                      </article>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </section>
          </Reveal>
          <Reveal delay={0.16}>
            <section className="result-section">
              <div className="result-section-title"><span>04</span><div><p className="eyebrow">Fix checklist</p><h2>Make the next version.</h2></div></div>
              <div className="checklist">{review.checklist.map((item, index) => <label key={item.label} className={checked.includes(index) ? "checked" : ""}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])} /><span><Check /></span><p>{item.label}</p><b>{item.priority}</b></label>)}</div>
            </section>
          </Reveal>
          <Reveal delay={0.18}><ImprovementPanel review={review} /></Reveal>
          <Reveal delay={0.2}><ComparisonPanel review={review} originalPreview={preview} /></Reveal>
          <Reveal delay={0.22}><FollowUpChat review={review} /></Reveal>
        </section>
      </div>
    </main>
  );
}

function parseReviewCreatePayload(payload: unknown) {
  const response = reviewCreateResponseSchema.safeParse(payload);
  if (response.success) return response.data;

  return {
    review: reviewOutputSchema.parse(payload),
    persistence: { savedToAccount: false },
  };
}

function cacheCompletedReviewForDashboard(userId: string, review: ReviewOutput, category: ReviewCategory, savedToAccount: boolean) {
  const storedReview = createStoredReviewDocument({
    userId,
    review,
    category,
    syncState: savedToAccount ? "cloud" : "local",
  });
  const cached = cacheReviewDocument(storedReview);
  if (!cached) {
    throw new Error("The critique was created, but this browser could not prepare it for your dashboard.");
  }

  return savedToAccount
    ? { syncedToCloud: true }
    : {
        syncedToCloud: false,
        message: "Saved to your dashboard on this device. IroGuide will keep syncing it to your account automatically.",
      };
}

async function syncCompletedReviewToAccount(idToken: string, userId: string, review: ReviewOutput, category: ReviewCategory) {
  const storedReview = createStoredReviewDocument({ userId, review, category, syncState: "local" });
  cacheReviewDocument(storedReview);
  const payload = await postJsonWithFallback({
    path: "/api/reviews/sync",
    unavailableMessage: "Review sync is not available right now.",
    failureMessage: "Review sync failed.",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documents: [storedReview] }),
    },
  });
  const syncResult = reviewSyncResponseSchema.parse(payload);
  const syncedToCloud = syncResult.savedIds.includes(storedReview.id);
  cacheReviewDocument({ ...storedReview, syncState: syncedToCloud ? "cloud" : "local", updatedAt: new Date().toISOString() });

  return syncedToCloud
    ? { syncedToCloud: true }
    : {
        syncedToCloud: false,
        message: "Saved to your dashboard on this device. IroGuide will keep syncing it to your account automatically.",
      };
}

async function deleteActiveReviewDraft(userId: string) {
  await deleteDoc(doc(getFirebaseClientFirestore(), "reviewDrafts", getActiveReviewDraftId(userId)));
}

function getActiveReviewDraftId(userId: string) {
  return `${userId}_active`;
}

function hasBriefContent(brief: { audience: string; purpose: string; style: string; goal: string; concern: string }) {
  return Object.values(brief).some((value) => value.trim().length > 0);
}

function hasDraftContent({ brief, category, file, mode, step }: { brief: { audience: string; purpose: string; style: string; goal: string; concern: string }; category: ReviewCategory; file: File | null; mode: (typeof feedbackModes)[number]; step: Step }) {
  return Boolean(file || hasBriefContent(brief) || category !== "website" || mode !== "mentor" || step > 1);
}

function getBriefValidationMessage(field: unknown) {
  if (field === "audience") return "Target audience must be at least 3 characters.";
  if (field === "purpose") return "Purpose must be at least 3 characters.";
  if (field === "style") return "Style direction must be at least 2 characters.";
  if (field === "goal") return "Primary goal must be at least 3 characters.";
  if (field === "concern") return "Specific concern is too long.";
  return "Review brief details are incomplete or invalid.";
}

function FixThisFirstCard({ action }: { action: FixFirstAction }) {
  return (
    <section className={`fix-first-card priority-${action.priority}`} aria-labelledby="fix-first-title">
      <span className="mono-label">Fix this first</span>
      <div>
        <h2 id="fix-first-title">{action.action}</h2>
        <p>{action.reason}</p>
      </div>
      <strong>{action.issueCategory}</strong>
    </section>
  );
}
