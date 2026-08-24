"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import type { ResearchFeedback } from "@/domain/product-evidence";
import { useAuth } from "@/features/auth/auth-provider";
import { submitResearchFeedback } from "@/lib/product-evidence";

const cohortOptions = [
  ["beginner-designer", "Beginner designer"],
  ["freelancer", "Freelancer"],
  ["ui-ux-designer", "UI/UX designer"],
] as const;
const clarityOptions = [
  ["clear", "Clear — I understand the current value"],
  ["partly-clear", "Partly clear — I still have questions"],
  ["unclear", "Unclear — the product promise needs work"],
] as const;
const nextStepOptions = [
  ["read-docs", "Read the product guide"],
  ["return-later", "Return when the free experience changes"],
  ["check-review-availability", "Check when critique becomes available"],
  ["prepare-case-study", "Prepare a private case-study outline"],
] as const;

export function ResearchFeedbackForm() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Omit<ResearchFeedback, "researchConsent"> & { researchConsent: boolean }>({
    clarity: "clear",
    cohort: "beginner-designer",
    nextStep: "read-docs",
    researchConsent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!feedback.researchConsent) {
      setError("Confirm research consent before submitting this response.");
      return;
    }
    setSubmitting(true);
    try {
      await submitResearchFeedback(user!, { ...feedback, researchConsent: true });
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Research feedback could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="research-form research-form-success" aria-live="polite">
        <CheckCircle2 />
        <p className="eyebrow">Response received</p>
        <h2>Thank you for the signal.</h2>
        <p>Your categorical response will be used only in aggregate. It does not place you on a live-critique waitlist.</p>
      </section>
    );
  }

  return (
    <form className="research-form" onSubmit={onSubmit}>
      <header>
        <span className="mono-label">4 BOUNDED ANSWERS</span>
        <h2>Free-launch feedback</h2>
        <p>No open text is collected, reducing the chance of private client or creative content entering research data.</p>
      </header>

      <ResearchFieldset legend="Which group best describes you?" name="cohort" options={cohortOptions} value={feedback.cohort} onChange={(cohort) => setFeedback({ ...feedback, cohort })} />
      <ResearchFieldset legend="How clear is IroGuide's current free value?" name="clarity" options={clarityOptions} value={feedback.clarity} onChange={(clarity) => setFeedback({ ...feedback, clarity })} />
      <ResearchFieldset legend="What would you do next?" name="nextStep" options={nextStepOptions} value={feedback.nextStep} onChange={(nextStep) => setFeedback({ ...feedback, nextStep })} />

      <label className="research-consent">
        <input type="checkbox" required checked={feedback.researchConsent} onChange={(event) => setFeedback({ ...feedback, researchConsent: event.target.checked })} />
        <span><strong>Research consent</strong>I agree that this de-identified categorical response may be included in product research aggregates. This does not consent to marketing or public attribution.</span>
      </label>

      {error && <p className="form-error" role="alert"><AlertCircle /> {error}</p>}
      <button className="button button-dark" type="submit" disabled={submitting || !feedback.researchConsent}>
        {submitting ? <><LoaderCircle className="spin" /> Sending...</> : <>Submit feedback <Send size={17} /></>}
      </button>
    </form>
  );
}

function ResearchFieldset<Value extends string>({
  legend,
  name,
  onChange,
  options,
  value,
}: {
  legend: string;
  name: string;
  onChange: (value: Value) => void;
  options: ReadonlyArray<readonly [Value, string]>;
  value: Value;
}) {
  return (
    <fieldset className="research-question">
      <legend>{legend}</legend>
      <div>
        {options.map(([optionValue, label]) => (
          <label key={optionValue}>
            <input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
