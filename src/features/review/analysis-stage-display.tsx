"use client";

import { useEffect, useState } from "react";
import { Check, CircleDashed, Sparkles } from "lucide-react";

const ANALYSIS_STAGES = [
  { title: "Securing upload", detail: "Checking your signed-in session and preparing the private request." },
  { title: "Reading composition", detail: "Reviewing the submitted context and demo-safe image metadata." },
  { title: "Comparing brief and audience", detail: "Matching the critique tone to your category, goal, and audience." },
  { title: "Building recommendations", detail: "Ordering observations into practical next steps." },
  { title: "Checking review consistency", detail: "Validating the structured critique before it appears." },
] as const;

const STAGE_INTERVAL_MS = 2200;
const LONG_RUNNING_MS = 25000;

export function AnalysisStageDisplay() {
  const [stageIndex, setStageIndex] = useState(0);
  const [isLongRunning, setIsLongRunning] = useState(false);
  const activeStage = ANALYSIS_STAGES[stageIndex];

  useEffect(() => {
    const stageTimer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, ANALYSIS_STAGES.length - 1));
    }, STAGE_INTERVAL_MS);
    const longRunningTimer = window.setTimeout(() => setIsLongRunning(true), LONG_RUNNING_MS);

    return () => {
      window.clearInterval(stageTimer);
      window.clearTimeout(longRunningTimer);
    };
  }, []);

  return (
    <section className="analysis-stage" aria-labelledby="analysis-stage-title">
      <div className="analysis-orbit" aria-hidden="true">
        <span />
        <Sparkles size={19} />
      </div>
      <div className="analysis-copy">
        <span className="mono-label">Demo review in progress</span>
        <h3 id="analysis-stage-title">{activeStage.title}</h3>
        <p aria-live="polite">{activeStage.detail}</p>
        {isLongRunning && <p className="analysis-long-note" role="status">Still working. Your upload, brief, and form entries are kept in place if the request needs a retry.</p>}
      </div>
      <ol className="analysis-steps" aria-label="Review preparation stages">
        {ANALYSIS_STAGES.map((stage, index) => {
          const isComplete = index < stageIndex;
          const isActive = index === stageIndex;

          return (
            <li key={stage.title} className={isActive ? "active" : isComplete ? "complete" : ""}>
              <span>{isComplete ? <Check size={13} /> : <CircleDashed size={13} />}</span>
              <strong>{stage.title}</strong>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
