"use client";

import { useState } from "react";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { reviewFindingFeedbackReasons, type ReviewFindingFeedback } from "@/domain/review-feedback";
import { useAuth } from "@/features/auth/auth-provider";
import { postJsonWithFallback } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";

export function ReviewFindingFeedback({
  issueId,
  reviewDocumentId,
  rubricId,
}: {
  issueId: string;
  reviewDocumentId: string;
  rubricId: string;
}) {
  const { user } = useAuth();
  const [verdict, setVerdict] = useState<ReviewFindingFeedback["verdict"] | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(nextVerdict: ReviewFindingFeedback["verdict"], nextReason?: ReviewFindingFeedback["reason"]) {
    const token = await user?.getIdToken();
    if (!token || status === "saving") return;
    setVerdict(nextVerdict);
    setStatus("saving");
    try {
      await postJsonWithFallback({
        path: "/api/reviews/feedback",
        unavailableMessage: "Finding feedback is unavailable right now.",
        failureMessage: "Finding feedback could not be saved.",
        init: {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ reviewDocumentId, issueId, verdict: nextVerdict, ...(nextReason ? { reason: nextReason } : {}) }),
        },
      });
      trackEvent("review_finding_feedback", { verdict: nextVerdict, reason: nextReason ?? "none", rubric_id: rubricId });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  if (status === "saved") {
    return <p className="finding-feedback-status" role="status"><Check size={14} /> Thanks — your feedback is saved.</p>;
  }

  return (
    <div className="finding-feedback" aria-label="Rate this critique finding">
      <span>Was this useful?</span>
      <button type="button" onClick={() => void submit("helpful")} disabled={status === "saving"} aria-pressed={verdict === "helpful"}>
        <ThumbsUp size={14} /> Helpful
      </button>
      <button type="button" onClick={() => { setVerdict("not-helpful"); setStatus("idle"); }} disabled={status === "saving"} aria-pressed={verdict === "not-helpful"}>
        <ThumbsDown size={14} /> Not helpful
      </button>
      {verdict === "not-helpful" && (
        <div className="finding-feedback-reasons" aria-label="Why was this not helpful?">
          {reviewFindingFeedbackReasons.map((item) => (
            <button key={item} type="button" disabled={status === "saving"} onClick={() => void submit("not-helpful", item)}>
              {formatReason(item)}
            </button>
          ))}
        </div>
      )}
      {status === "error" && <p className="finding-feedback-error" role="alert">Feedback was not saved. Please try again.</p>}
    </div>
  );
}

function formatReason(reason: NonNullable<ReviewFindingFeedback["reason"]>) {
  return reason.replaceAll("-", " ");
}
