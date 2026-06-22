"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { getSafeReviewAnnotations } from "@/domain/review-annotations";
import type { ReviewOutput } from "@/domain/review";

type AnnotationOverlayProps = {
  review: Pick<ReviewOutput, "annotations" | "issues">;
  activeIssueId: string | null;
  onActiveIssueChange: (issueId: string | null) => void;
};

export function AnnotationOverlay({ review, activeIssueId, onActiveIssueChange }: AnnotationOverlayProps) {
  const [visible, setVisible] = useState(true);
  const annotations = getSafeReviewAnnotations(review);

  if (annotations.length === 0) {
    return null;
  }

  return (
    <>
      <div className="annotation-toolbar">
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => {
            setVisible((current) => !current);
            onActiveIssueChange(null);
          }}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          {visible ? "Hide notes" : "Show notes"}
        </button>
      </div>
      {visible && (
        <div className="annotation-layer" aria-label="Visual critique annotations">
          {annotations.map((annotation) => {
            const isActive = activeIssueId === annotation.issueId;

            return (
              <button
                type="button"
                key={annotation.id}
                className={`annotation-marker${isActive ? " is-active" : ""}`}
                style={{
                  left: `${annotation.x * 100}%`,
                  top: `${annotation.y * 100}%`,
                  width: `${annotation.width * 100}%`,
                  height: `${annotation.height * 100}%`,
                }}
                aria-label={`${annotation.label}: ${annotation.description}`}
                aria-describedby={annotation.issueDomId}
                onFocus={() => onActiveIssueChange(annotation.issueId)}
                onBlur={() => onActiveIssueChange(null)}
                onMouseEnter={() => onActiveIssueChange(annotation.issueId)}
                onMouseLeave={() => onActiveIssueChange(null)}
                onClick={() => document.getElementById(annotation.issueDomId)?.scrollIntoView({ block: "center", behavior: "smooth" })}
              >
                <span>{String(annotation.issueIndex + 1).padStart(2, "0")}</span>
                <strong>{annotation.label}</strong>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
