"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, FileImage, LoaderCircle, LockKeyhole, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import { categoryLabels, feedbackModes, reviewCategories, reviewOutputSchema, type ReviewOutput } from "@/domain/review";
import { apiBaseUrl } from "@/config/api";
import { ImprovementPanel } from "./improvement-panel";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
type Step = 1 | 2 | 3 | 4;

const modeCopy = {
  friendly: ["Friendly", "Simple, encouraging, and educational."],
  mentor: ["Mentor", "Professional, detailed, and balanced."],
  direct: ["Direct", "Sharp and honest, never personal."],
} as const;

export function ReviewStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const [category, setCategory] = useState<(typeof reviewCategories)[number]>("website");
  const [mode, setMode] = useState<(typeof feedbackModes)[number]>("mentor");
  const [brief, setBrief] = useState({ audience: "", purpose: "", style: "", goal: "", concern: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [review, setReview] = useState<ReviewOutput | null>(null);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function acceptFile(candidate?: File) {
    setFileError("");
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) { setFileError("Choose a PNG, JPEG, or WebP image."); return; }
    if (candidate.size > MAX_SIZE) { setFileError("This file is larger than the 10 MB limit."); return; }
    if (candidate.size === 0) { setFileError("This file appears to be empty."); return; }
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
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) { acceptFile(event.target.files?.[0]); event.target.value = ""; }
  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); acceptFile(event.dataTransfer.files?.[0]); }
  const briefValid = Object.entries(brief).filter(([key]) => key !== "concern").every(([, value]) => value.trim().length >= 2);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !briefValid || submitting) return;
    setSubmitting(true); setSubmitError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, mode, file: { name: file.name, type: file.type, size: file.size }, brief }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "Review failed.");
      const parsed = reviewOutputSchema.parse(payload);
      setReview(parsed);
      const stored = JSON.parse(localStorage.getItem("dinodesign-reviews") ?? "[]") as unknown[];
      localStorage.setItem("dinodesign-reviews", JSON.stringify([{ ...parsed, category, thumbnail: preview }, ...stored].slice(0, 12)));
    } catch (error) { setSubmitError(error instanceof Error ? error.message : "Review failed. Please try again."); }
    finally { setSubmitting(false); }
  }

  if (review) return <ReviewResult review={review} preview={preview} onRestart={() => { setReview(null); setStep(1); }} />;

  return (
    <main className="studio-shell">
      <header className="studio-header"><Link href="/" className="wordmark"><span className="wordmark-mark">D</span>DinoDesign</Link><div><span className="draft-status"><Check size={13} /> Draft kept locally</span><Link href="/dashboard">Dashboard</Link></div></header>
      <form className="studio-layout" onSubmit={submit}>
        <aside className="studio-sidebar">
          <Link href="/" className="back-link"><ArrowLeft size={16} /> Back home</Link>
          <p className="eyebrow light">New critique</p><h1>Let&apos;s see the<br />work in context.</h1>
          <ol className="step-list">
            {["Upload", "Design brief", "Feedback mode", "Confirm"].map((label, index) => <li key={label} className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""}><button type="button" onClick={() => step > index && setStep((index + 1) as Step)}><span>{step > index + 1 ? <Check size={14} /> : index + 1}</span>{label}</button></li>)}
          </ol>
          <div className="privacy-note"><LockKeyhole size={18} /><div><strong>Private by default</strong><p>Your work is never published without permission.</p></div></div>
        </aside>

        <section className="studio-workspace">
          <div className="workspace-top"><span className="mono-label">STEP {step} / 4</span><span>{["Choose one design image", "Tell us what success means", "Choose your critic", "Review the details"][step - 1]}</span></div>
          {step === 1 && <div className="form-panel"><div className="panel-heading"><span>01</span><div><h2>Upload your design</h2><p>We&apos;ll use your brief to critique it—not judge it in a vacuum.</p></div></div>{preview && file ? <div className="upload-preview"><div className="preview-media"><Image src={preview} alt="Selected design preview" fill unoptimized /></div><div className="file-meta"><FileImage /><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.replace("image/", "").toUpperCase()}</span></div><button type="button" aria-label="Remove selected image" onClick={removeFile}><X /></button></div><button type="button" className="button-secondary" onClick={() => inputRef.current?.click()}><RotateCcw size={16} /> Replace image</button></div> : <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><div className="upload-icon"><Upload /></div><h3>Drop your design here</h3><p>or choose a file from your device</p><button type="button" className="button button-dark" onClick={() => inputRef.current?.click()}>Browse files</button><span>PNG, JPEG, or WebP · 10 MB maximum</span></div>}<input ref={inputRef} className="sr-only" type="file" accept={ACCEPTED.join(",")} onChange={onInput} />{fileError && <p className="form-error" role="alert"><AlertCircle /> {fileError}</p>}<div className="panel-actions"><span /><button type="button" className="button" disabled={!file} onClick={() => setStep(2)}>Continue <ArrowRight size={17} /></button></div></div>}

          {step === 2 && <div className="form-panel"><div className="panel-heading"><span>02</span><div><h2>Give us the brief</h2><p>A good critique depends on audience, purpose, and intent.</p></div></div><fieldset className="category-field"><legend>Design category</legend><div className="category-grid">{reviewCategories.map((item) => <label key={item}><input type="radio" name="category" checked={category === item} onChange={() => setCategory(item)} /><span>{categoryLabels[item]}</span></label>)}</div></fieldset><div className="field-grid">{([['audience','Target audience','e.g. Independent designers aged 22–35'],['purpose','Purpose','e.g. Launch a creative conference'],['style','Style direction','e.g. Bold, editorial, energetic'],['goal','Primary goal','e.g. Drive early-bird registrations']] as const).map(([key,label,placeholder]) => <label className="field" key={key}><span>{label} <b>Required</b></span><textarea rows={2} value={brief[key]} placeholder={placeholder} onChange={(event) => setBrief({...brief, [key]: event.target.value})} required /></label>)}</div><label className="field"><span>Specific concern <em>Optional</em></span><textarea rows={3} value={brief.concern} placeholder="What already feels unresolved?" onChange={(event) => setBrief({...brief, concern: event.target.value})} /></label><div className="panel-actions"><button type="button" className="button-secondary" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button type="button" className="button" disabled={!briefValid} onClick={() => setStep(3)}>Choose feedback <ArrowRight size={17} /></button></div></div>}

          {step === 3 && <div className="form-panel"><div className="panel-heading"><span>03</span><div><h2>How should we talk?</h2><p>The standards stay consistent. You choose the voice.</p></div></div><div className="mode-selector">{feedbackModes.map((item, index) => <label key={item} className={`select-mode mode-${item}`}><input type="radio" name="mode" checked={mode === item} onChange={() => setMode(item)} /><span className="mode-index">0{index + 1}</span><MessageIcon mode={item} /><div><h3>{modeCopy[item][0]}</h3><p>{modeCopy[item][1]}</p><blockquote>“{item === 'friendly' ? 'Let’s make the main message easier to notice.' : item === 'mentor' ? 'The hierarchy needs a more deliberate first reading point.' : 'The hierarchy is unresolved. Fix it before adding anything else.'}”</blockquote></div><span className="radio-mark"><Check /></span></label>)}</div><div className="panel-actions"><button type="button" className="button-secondary" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button><button type="button" className="button" onClick={() => setStep(4)}>Review details <ArrowRight size={17} /></button></div></div>}

          {step === 4 && <div className="form-panel"><div className="panel-heading"><span>04</span><div><h2>Ready for critique</h2><p>Confirm the context. You can still go back and change anything.</p></div></div><div className="confirmation">{preview && <div className="confirm-image"><Image src={preview} alt="Design ready for review" fill unoptimized /></div>}<div className="confirm-details"><div><span>Category</span><strong>{categoryLabels[category]}</strong></div><div><span>Feedback</span><strong>{modeCopy[mode][0]}</strong></div><div><span>Audience</span><strong>{brief.audience}</strong></div><div><span>Goal</span><strong>{brief.goal}</strong></div></div></div><div className="demo-disclosure"><Sparkles /><div><strong>Demo review provider</strong><p>This build validates the complete workflow and returns structured sample critique. It does not inspect image pixels until a live vision provider is configured.</p></div></div>{submitError && <p className="form-error" role="alert"><AlertCircle /> {submitError}</p>}<div className="panel-actions"><button type="button" className="button-secondary" onClick={() => setStep(3)} disabled={submitting}><ArrowLeft size={16} /> Back</button><button type="submit" className="button button-review" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" /> Building your critique…</> : <>Start critique <Sparkles size={17} /></>}</button></div></div>}
        </section>
      </form>
    </main>
  );
}

function MessageIcon({ mode }: { mode: (typeof feedbackModes)[number] }) { return <span className="message-glyph" aria-hidden="true">{mode === "friendly" ? "○" : mode === "mentor" ? "⌗" : "↗"}</span>; }

function ReviewResult({ review, preview, onRestart }: { review: ReviewOutput; preview: string | null; onRestart: () => void }) {
  const [checked, setChecked] = useState<number[]>([]);
  return <main className="result-shell"><header className="studio-header dark"><Link href="/" className="wordmark"><span className="wordmark-mark">D</span>DinoDesign</Link><div><span className="demo-badge">Demo critique</span><Link href="/dashboard">Dashboard</Link></div></header><div className="result-layout"><aside className="result-preview"><button className="back-link light-button" onClick={onRestart}><ArrowLeft /> New review</button>{preview && <div className="result-image"><Image src={preview} alt="Reviewed design" fill unoptimized /></div>}<div className="preview-caption"><span className="mono-label">SOURCE DESIGN</span><p>Private · Local preview</p></div></aside><section className="result-content"><div className="result-hero"><div><p className="eyebrow">Your critique is ready</p><h1>{review.summary.split(".")[0]}.</h1><p>{review.summary}</p></div><div className="result-score"><span className="mono-label">OVERALL</span><strong>{review.overallScore}<small>/10</small></strong><span>A useful baseline</span></div></div><div className="demo-warning"><AlertCircle /><p><strong>Transparent demo:</strong> this structured sample validates the DinoDesign experience but does not analyze pixels. Configure a live vision adapter for real critique.</p></div><section className="result-section"><div className="result-section-title"><span>01</span><div><p className="eyebrow">What is working</p><h2>Keep these decisions.</h2></div></div><ul className="strength-list">{review.strengths.map((item) => <li key={item}><Check />{item}</li>)}</ul></section><section className="result-section"><div className="result-section-title"><span>02</span><div><p className="eyebrow">Score map</p><h2>Where to focus.</h2></div></div><div className="result-scores">{review.scores.map((item) => <div key={item.label}><span>{item.label}</span><i><b style={{width: `${item.score * 10}%`}} /></i><strong>{item.score}</strong></div>)}</div></section><section className="result-section"><div className="result-section-title"><span>03</span><div><p className="eyebrow">Priority critique</p><h2>What, why, and how.</h2></div></div><div className="issue-list">{review.issues.map((issue, index) => <article className={`issue-card priority-${issue.priority}`} key={issue.category}><header><span>{String(index + 1).padStart(2,'0')}</span><div><p>{issue.category}</p><strong>{issue.score}/10</strong></div><b>{issue.priority} priority</b></header><div><h3>What we see</h3><p>{issue.observation}</p><h3>Why it matters</h3><p>{issue.impact}</p><h3>How to improve</h3><p>{issue.recommendation}</p><ul>{issue.actions.map((action) => <li key={action}>{action}</li>)}</ul></div></article>)}</div></section><section className="result-section"><div className="result-section-title"><span>04</span><div><p className="eyebrow">Fix checklist</p><h2>Make the next version.</h2></div></div><div className="checklist">{review.checklist.map((item,index) => <label key={item.label} className={checked.includes(index) ? 'checked' : ''}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked(checked.includes(index) ? checked.filter(value => value !== index) : [...checked,index])} /><span><Check /></span><p>{item.label}</p><b>{item.priority}</b></label>)}</div></section><ImprovementPanel review={review} /><section className="follow-up"><Sparkles /><p className="eyebrow light">Keep the conversation going</p><h2>Ask your mentor.</h2><div>{review.followUps.map((question) => <button key={question}>{question} <ArrowRight /></button>)}</div><p className="follow-note">Live follow-up conversation arrives with the configured AI adapter.</p></section></section></div></main>;
}
