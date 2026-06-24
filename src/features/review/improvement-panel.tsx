"use client";

import { useState } from "react";
import { Check, Clipboard, LoaderCircle, Sparkles, WandSparkles } from "lucide-react";
import { improvementOutputSchema, type ImprovementOutput } from "@/domain/improvement";
import type { ReviewOutput } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";
import { postJsonWithFallback } from "@/lib/api-client";

export function ImprovementPanel({ review }: { review: ReviewOutput }) {
  const { user } = useAuth();
  const [output, setOutput] = useState<ImprovementOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError("");
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error("Sign in again before generating an improvement plan.");
      const payload = await postJsonWithFallback({
        path: "/api/improvements",
        unavailableMessage: "The improvement plan is unavailable right now.",
        failureMessage: "The improvement plan is unavailable right now.",
        init: { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ review, target: "human-designer" }) },
      });
      setOutput(improvementOutputSchema.parse(payload));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The improvement plan failed."); }
    finally { setLoading(false); }
  }

  async function copyPrompt() {
    if (!output) return;
    await navigator.clipboard.writeText(output.prompt);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  return <section className="improvement-panel"><div className="improvement-heading"><div><p className="eyebrow light">Optional improvement tools</p><h2>Turn critique into a brief.</h2><p>Keep creative control. Generate an ordered plan and a prompt you can hand to a designer or another tool.</p></div><WandSparkles /></div>{!output ? <div className="improvement-empty"><div><Sparkles /><strong>No automatic redesign</strong><p>IroGuide will first translate the critique into a controlled implementation plan. Image generation remains unavailable until a real provider is configured.</p></div><button className="button button-lime" onClick={generate} disabled={loading}>{loading ? <><LoaderCircle className="spin" /> Building plan…</> : <>Generate improvement plan <Sparkles /></>}</button>{error && <p role="alert">{error}</p>}</div> : <div className="improvement-output"><div className="improvement-steps">{output.steps.map((step) => <article key={step.order}><span>{String(step.order).padStart(2,"0")}</span><div><h3>{step.title}</h3><p>{step.rationale}</p><ul>{step.actions.map((action) => <li key={action}><Check />{action}</li>)}</ul></div></article>)}</div><div className="prompt-card"><span className="mono-label">REDESIGN PROMPT</span><p>{output.prompt}</p><button className="button-secondary" onClick={copyPrompt}>{copied ? <Check /> : <Clipboard />}{copied ? "Copied" : "Copy prompt"}</button></div><div className="manual-checks"><strong>Before you call it finished</strong>{output.manualChecks.map((check) => <span key={check}><Check />{check}</span>)}</div></div>}</section>;
}
