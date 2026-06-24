"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getAnnotationIssueId, getSafeReviewAnnotations } from "@/domain/review-annotations";
import type { ReviewOutput } from "@/domain/review";
import { getContainedMediaFrame, type AnnotationFrame } from "./annotation-frame";

type AnnotationOverlayProps = {
  review: Pick<ReviewOutput, "annotations" | "issues">;
  activeIssueId: string | null;
  onActiveIssueChange: (issueId: string | null) => void;
};

export function AnnotationOverlay({ review, activeIssueId, onActiveIssueChange }: AnnotationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [frame, setFrame] = useState<AnnotationFrame | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const annotations = getSafeReviewAnnotations(review);

  useEffect(() => {
    if (!visible) return;

    const layer = layerRef.current;
    const container = layer?.parentElement;
    const image = container?.querySelector("img");
    if (!container || !image) return;

    const updateFrame = () => {
      const containerRect = container.getBoundingClientRect();
      const nextFrame = getContainedMediaFrame(
        { width: containerRect.width, height: containerRect.height },
        { width: image.naturalWidth, height: image.naturalHeight },
      );
      setFrame(nextFrame);
    };

    updateFrame();
    image.addEventListener("load", updateFrame);

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateFrame);
    observer?.observe(container);
    observer?.observe(image);

    return () => {
      image.removeEventListener("load", updateFrame);
      observer?.disconnect();
    };
  }, [visible]);

  if (annotations.length === 0 && review.issues.length === 0) {
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
      {visible && annotations.length === 0 && (
        <div className="annotation-note-panel" aria-label="Review notes">
          <span className="mono-label">Review notes</span>
          <ul>
            {review.issues.slice(0, 3).map((issue, index) => {
              const issueId = getAnnotationIssueId(issue, index);

              return (
                <li key={issue.id ?? issue.category}>
                  <button
                    type="button"
                    onClick={() => document.getElementById(`review-${issueId}`)?.scrollIntoView({ block: "center", behavior: "smooth" })}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{issue.category}</strong>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {visible && annotations.length > 0 && (
        <div
          ref={layerRef}
          className="annotation-layer"
          style={frame ? {
            bottom: "auto",
            height: `${frame.height}px`,
            left: `${frame.left}px`,
            right: "auto",
            top: `${frame.top}px`,
            width: `${frame.width}px`,
          } : undefined}
          aria-label="Visual critique annotations"
        >
          {annotations.map((annotation) => {
            const isActive = activeIssueId === annotation.issueId;
            const isNearRightEdge = annotation.x + annotation.width > 0.72;
            const isNearTopEdge = annotation.y < 0.16;
            const markerClassName = [
              "annotation-marker",
              isActive ? "is-active" : "",
              isNearRightEdge ? "edge-right" : "",
              isNearTopEdge ? "edge-top" : "",
            ].filter(Boolean).join(" ");

            return (
              <button
                type="button"
                key={annotation.id}
                className={markerClassName}
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
