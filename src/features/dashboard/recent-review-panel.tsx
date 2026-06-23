import Link from "next/link";
import { ArrowRight, BadgeCheck, RotateCcw, Sparkles } from "lucide-react";
import type { DashboardReviewSummary } from "@/domain/dashboard-review";

export function RecentReviewPanel({ review }: { review: DashboardReviewSummary }) {
  return (
    <section className="recent-review-panel" aria-labelledby="recent-review-title">
      <div className="recent-review-copy">
        <p className="eyebrow"><Sparkles /> Continue where you left off</p>
        <div>
          <span className="mono-label">{review.category} / {review.dateLabel}</span>
          <h2 id="recent-review-title">{review.score}<small>/10</small></h2>
        </div>
        <p>{review.summary}</p>
      </div>

      <div className="recent-review-details">
        <article>
          <span><BadgeCheck /> Strongest area</span>
          <strong>{review.strongestArea}</strong>
        </article>
        <article>
          <span><Sparkles /> Fix first</span>
          <strong>{review.fixFirst}</strong>
          <p>{review.firstAction}</p>
        </article>
      </div>

      <div className="recent-review-actions">
        <span className="recent-review-storage">{review.sourceImageSaved ? "Private source image saved" : "Source image still syncing"}</span>
        <Link className="button button-dark" href={`#review-${review.id}`}>Open critique <ArrowRight size={17} /></Link>
        <Link className="button-secondary" href="/review/new?revision=latest">Review next version <RotateCcw size={16} /></Link>
      </div>
    </section>
  );
}
