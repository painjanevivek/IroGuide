"use client";

import type { User } from "firebase/auth";
import { CheckCircle2, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActivationSaveNotice, type ActivationSaveState } from "@/components/activation-save-notice";
import { deriveLearningPriorities, getLearningRubric, type SelfReviewAnswer } from "@/domain/learning";
import { SELF_REVIEW_RUBRIC_VERSION, type ReviewCategory } from "@/domain/product-activation";
import { categoryLabels, reviewCategories } from "@/domain/review";
import { captureProductEvidence } from "@/lib/product-evidence";
import { clearSelfReviews, createSelfReview, listSelfReviews, updateSelfReview, type PublicSelfReview } from "@/lib/learning-api-client";

const answers: Array<{ id: SelfReviewAnswer; label: string }> = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "unsure", label: "Unsure" },
  { id: "not-applicable", label: "Not applicable" },
];

export function SelfReviewTool({ user }: { user: User }) {
  const [category, setCategory] = useState<ReviewCategory>("ui");
  const [session, setSession] = useState<PublicSelfReview | null>(null);
  const [responses, setResponses] = useState<Array<{ itemId: string; answer: SelfReviewAnswer }>>([]);
  const [saveState, setSaveState] = useState<ActivationSaveState>("saving");
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const rubric = useMemo(() => getLearningRubric(session?.category ?? category), [category, session?.category]);
  const priorities = useMemo(() => deriveLearningPriorities(session?.category ?? category, responses), [category, responses, session?.category]);

  useEffect(() => {
    let active = true;
    void listSelfReviews(user).then((records) => {
      if (!active) return;
      const current = records.find((record) => record.status === "draft") ?? records[0] ?? null;
      setSession(current);
      if (current) { setCategory(current.category); setResponses(current.responses); }
      setSaveState("idle");
    }).catch((loadError) => {
      if (active) { setError(loadError instanceof Error ? loadError.message : "Self-review history could not load."); setSaveState("error"); }
    });
    return () => { active = false; };
  }, [user]);

  async function start() {
    setError("");
    setSaveState("saving");
    try {
      const next = await createSelfReview(user, {
        schemaVersion: 1,
        id: `self-${crypto.randomUUID()}`,
        mutationId: crypto.randomUUID(),
        rubricVersion: SELF_REVIEW_RUBRIC_VERSION,
        category,
        goalLabel: "",
        responses: [],
      });
      setSession(next);
      setResponses([]);
      setSaveState("saved");
      void captureProductEvidence(user, { name: "self_review_started", category });
    } catch (startError) { handleError(startError); }
  }

  async function answer(itemId: string, answerValue: SelfReviewAnswer) {
    if (!session || session.status === "completed") return;
    const nextResponses = [...responses.filter((response) => response.itemId !== itemId), { itemId, answer: answerValue }];
    setResponses(nextResponses);
    setSaveState(navigator.onLine ? "saving" : "offline");
    if (!navigator.onLine) return;
    try {
      const next = await updateSelfReview(user, {
        schemaVersion: 1,
        id: session.id,
        expectedRevision: session.revision,
        mutationId: crypto.randomUUID(),
        changes: { responses: nextResponses },
      });
      setSession(next);
      setResponses(next.responses);
      setSaveState("saved");
      setError("");
    } catch (saveError) { handleError(saveError); }
  }

  async function complete() {
    if (!session || responses.length !== rubric.length) return;
    setSaveState("saving");
    try {
      const next = await updateSelfReview(user, {
        schemaVersion: 1,
        id: session.id,
        expectedRevision: session.revision,
        mutationId: crypto.randomUUID(),
        changes: { responses, status: "completed" },
      });
      setSession(next);
      setSaveState("saved");
      void captureProductEvidence(user, { name: "self_review_completed", category: next.category, priorityCount: next.priorityItemIds.length });
    } catch (saveError) { handleError(saveError); }
  }

  async function clearHistory() {
    setSaveState("saving");
    try {
      await clearSelfReviews(user);
      setSession(null);
      setResponses([]);
      setConfirmClear(false);
      setSaveState("saved");
    } catch (clearError) { handleError(clearError); }
  }

  function handleError(value: unknown) {
    const conflict = value instanceof Error && "status" in value && value.status === 409;
    setError(value instanceof Error ? value.message : "Self-review progress could not be saved.");
    setSaveState(conflict ? "conflict" : navigator.onLine ? "error" : "offline");
  }

  if (!session) {
    return <section className="learning-tool"><header><div><p className="mono-label">Image-free rubric</p><h3>Start a category self-review.</h3><p>You answer the rubric. IroGuide does not inspect or infer anything about your design.</p></div></header><label className="learning-select"><span>Design category</span><select value={category} onChange={(event) => setCategory(event.target.value as ReviewCategory)}>{reviewCategories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-dark" type="button" disabled={saveState === "saving"} onClick={() => void start()}>{saveState === "saving" ? <><LoaderCircle className="spin" /> Loading…</> : "Start self-review"}</button></section>;
  }

  return (
    <section className="learning-tool" aria-labelledby="self-review-title">
      <header><div><p className="mono-label">{categoryLabels[session.category]} / {session.rubricVersion}</p><h3 id="self-review-title">Check the work you can see.</h3><p>Answer honestly; Unsure is useful evidence, and Not applicable never becomes a priority.</p></div><span>{responses.length} / {rubric.length} answered</span></header>
      <div className="self-review-list">
        {rubric.map((item, index) => {
          const selected = responses.find((response) => response.itemId === item.id)?.answer;
          return <fieldset disabled={saveState === "saving" || session.status === "completed"} key={item.id}><legend><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</legend><p>{item.explanation}</p><details><summary>Example and verification</summary><p><strong>Example:</strong> {item.example}</p><p><strong>Verify:</strong> {item.verify}</p></details><div>{answers.map((answerOption) => <label className={selected === answerOption.id ? "is-selected" : ""} key={answerOption.id}><input checked={selected === answerOption.id} name={item.id} type="radio" onChange={() => void answer(item.id, answerOption.id)} /><span>{answerOption.label}</span></label>)}</div></fieldset>;
        })}
      </div>
      {priorities.length > 0 ? <section className="learning-priorities" aria-labelledby="priorities-title"><p className="eyebrow">Your answers, not visual analysis</p><h4 id="priorities-title">Up to three priorities to check next.</h4><ol>{priorities.map((item) => <li key={item.id}><CheckCircle2 /><span><strong>{item.label}</strong>{item.verify}</span></li>)}</ol></section> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <ActivationSaveNotice state={saveState} onReload={() => window.location.reload()} onRetry={() => session.status === "completed" ? undefined : void updateSelfReview(user, { schemaVersion: 1, id: session.id, expectedRevision: session.revision, mutationId: crypto.randomUUID(), changes: { responses } }).then(setSession).catch(handleError)} />
      <footer><button className="button button-dark" type="button" disabled={responses.length !== rubric.length || session.status === "completed" || saveState === "saving"} onClick={() => void complete()}>{session.status === "completed" ? "Self-review complete" : "Complete self-review"}</button><button className="button-secondary" type="button" onClick={() => void start()}><RotateCcw /> Start a new one</button><button className="button-quiet" type="button" onClick={() => setConfirmClear((value) => !value)}><Trash2 /> Clear self-review history</button></footer>
      {confirmClear ? <div className="learning-confirm" role="group" aria-label="Confirm self-review deletion"><p>Delete every saved self-review? This cannot be undone.</p><button className="danger-button" type="button" onClick={() => void clearHistory()}>Delete self-reviews</button><button className="button-quiet" type="button" onClick={() => setConfirmClear(false)}>Cancel</button></div> : null}
    </section>
  );
}
