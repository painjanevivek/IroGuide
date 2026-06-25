"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, CircleDashed, LoaderCircle, Sparkles } from "lucide-react";
import { getProgressFlowSnapshot, type ProgressFlowStatus } from "@/lib/progress-flow";

export type ProgressFlowStep = {
  title: string;
  detail?: string;
};

export function ProgressFlow({
  backgroundNote,
  longRunningMs,
  onCancel,
  onRetry,
  stageIntervalMs,
  status = "running",
  steps,
  title,
}: {
  backgroundNote?: string;
  longRunningMs?: number;
  onCancel?: () => void;
  onRetry?: () => void;
  stageIntervalMs?: number;
  status?: ProgressFlowStatus;
  steps: readonly ProgressFlowStep[];
  title: string;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const snapshot = getProgressFlowSnapshot({
    elapsedMs,
    longRunningMs,
    stageIntervalMs,
    status,
    stepCount: steps.length,
  });
  const activeStep = steps[snapshot.activeStepIndex] ?? steps[0];
  const isTerminal = status === "success" || status === "error";

  useEffect(() => {
    if (isTerminal) return;
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 300);
    return () => window.clearInterval(intervalId);
  }, [isTerminal]);

  return (
    <section className={`progress-flow is-${status}`} aria-labelledby="progress-flow-title" aria-busy={status === "running"}>
      <div className="progress-flow-orbit" aria-hidden="true">
        <span />
        {status === "success" ? <Check size={19} /> : status === "error" ? <AlertCircle size={19} /> : <Sparkles size={19} />}
      </div>
      <div className="progress-flow-copy">
        <span className="mono-label">{title}</span>
        <h3 id="progress-flow-title">{status === "success" ? "Completed" : status === "error" ? "Needs attention" : activeStep.title}</h3>
        <p aria-live="polite">{status === "success" ? "The server confirmed the work is finished." : status === "error" ? "The request did not complete. Your inputs are still available." : activeStep.detail}</p>
        {snapshot.isLongRunning && status === "running" && <p className="progress-flow-long-note" role="status">{backgroundNote ?? "Still working. Your input is kept in place while the request finishes."}</p>}
        {(onRetry || onCancel) && status !== "success" && (
          <div className="progress-flow-actions">
            {onRetry && status === "error" && <button type="button" className="button-secondary" onClick={onRetry}>Retry</button>}
            {onCancel && status === "running" && <button type="button" className="button-secondary" onClick={onCancel}>Cancel</button>}
          </div>
        )}
      </div>
      <div className="progress-flow-meter" aria-hidden="true">
        <span style={{ transform: `scaleX(${snapshot.progressRatio})` }} />
      </div>
      <ol className="progress-flow-steps" aria-label={`${title} stages`}>
        {steps.map((step, index) => {
          const isComplete = status === "success" || index < snapshot.activeStepIndex;
          const isActive = status === "running" && index === snapshot.activeStepIndex;

          return (
            <li key={step.title} className={isActive ? "active" : isComplete ? "complete" : ""}>
              <span>{isComplete ? <Check size={13} /> : isActive ? <LoaderCircle size={13} /> : <CircleDashed size={13} />}</span>
              <strong>{step.title}</strong>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
