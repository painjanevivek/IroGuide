"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, LayoutDashboard, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { collection, limit, onSnapshot, query, where, type DocumentData } from "firebase/firestore";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { getRecentReviewSummary } from "@/domain/dashboard-review";
import { calculateProgress, type ProgressReview } from "@/domain/progress";
import { reviewDraftSchema, type ReviewDraft } from "@/domain/review-draft";
import { categoryLabels, reviewOutputSchema, type ReviewOutput } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";
import { getFirebaseClientFirestore } from "@/lib/firebase/client";
import { DataControls } from "./data-controls";
import { RecentReviewPanel } from "./recent-review-panel";

type StoredReview = ReviewOutput & ProgressReview & { category?: string };
type StoredDraft = ReviewDraft & { id: string; updatedAtMs: number | null };

export function Dashboard() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<StoredReview[]>([]);
  const [drafts, setDrafts] = useState<StoredDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!user) return;
    const db = getFirebaseClientFirestore();
    const reviewsQuery = query(collection(db, "reviews"), where("userId", "==", user.uid), limit(30));

    return onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const nextReviews = snapshot.docs
          .map((reviewDoc) => toStoredReview(reviewDoc.id, reviewDoc.data()))
          .filter((review): review is StoredReview => review !== null)
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
          .slice(0, 12);
        setLoadError("");
        setReviews(nextReviews);
        setLoading(false);
      },
      (error) => {
        setLoadError(error.message);
        setReviews([]);
        setLoading(false);
      },
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const db = getFirebaseClientFirestore();
    const draftsQuery = query(collection(db, "reviewDrafts"), where("userId", "==", user.uid), where("status", "==", "draft"), limit(12));

    return onSnapshot(
      draftsQuery,
      (snapshot) => {
        const nextDrafts = snapshot.docs
          .map((draftDoc) => toStoredDraft(draftDoc.id, draftDoc.data()))
          .filter((draft): draft is StoredDraft => draft !== null)
          .sort((left, right) => (right.updatedAtMs ?? 0) - (left.updatedAtMs ?? 0));
        setDrafts(nextDrafts);
      },
      () => setDrafts([]),
    );
  }, [user]);

  if (!user) return null;

  const progress = calculateProgress(reviews);
  const recentReview = getRecentReviewSummary(reviews);

  return (
    <main className="dashboard-main">
      <Reveal>
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Your design practice</p>
            <h1>Progress,<br />not perfection.</h1>
          </div>
          <Link className="button" href="/review/new">New review <ArrowRight /></Link>
        </div>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="workspace-badge">
          <ShieldCheck />
          <div>
            <strong>Private signed-in workspace</strong>
            <span>{user.email ?? user.displayName ?? "Your Firebase account"} is connected.</span>
          </div>
        </div>
      </Reveal>

      {drafts.length > 0 && (
        <Reveal delay={0.07}>
          <section className="draft-dashboard-section" aria-labelledby="draft-dashboard-title">
            <div className="dashboard-section-title"><div><p className="eyebrow">Saved drafts</p><h2 id="draft-dashboard-title">Pick up where you left.</h2></div><span>{drafts.length} draft{drafts.length === 1 ? "" : "s"} saved</span></div>
            <div className="draft-grid">
              {drafts.map((draft) => (
                <article className="draft-card" key={draft.id}>
                  <FileText />
                  <span>{categoryLabels[draft.category]}</span>
                  <h3>{getDraftTitle(draft)}</h3>
                  <p>{draft.file ? `${draft.file.name} was selected. Reselect the image before starting critique.` : "Brief context is saved. Add an image before starting critique."}</p>
                  <div><small>Step {draft.step} / 4</small>{draft.updatedAtMs && <time>{new Date(draft.updatedAtMs).toLocaleDateString()}</time>}</div>
                  <Link className="button button-dark button-small" href="/review/new">Continue draft <ArrowRight /></Link>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {loading ? (
        <Reveal delay={0.08}>
          <div className="dashboard-empty is-loading">
            <div><LoaderCircle className="spin" size={38} /><h2>Loading reviews</h2><p>Fetching your Firestore review history.</p></div>
          </div>
        </Reveal>
      ) : loadError ? (
        <Reveal delay={0.08}>
          <div className="dashboard-empty is-error">
            <div><LayoutDashboard size={38} /><h2>Could not load reviews</h2><p>{loadError}</p></div>
          </div>
        </Reveal>
      ) : reviews.length === 0 ? (
        <Reveal delay={0.08}>
          <div className="dashboard-empty is-empty">
            <div><LayoutDashboard size={38} /><h2>No reviews yet</h2><p>Your dashboard becomes useful after the first critique—no fake charts, no invented progress.</p><Link className="button button-dark" href="/review/new">Review a design <Sparkles /></Link></div>
          </div>
        </Reveal>
      ) : (
        <>
          {recentReview && <Reveal delay={0.08}><RecentReviewPanel review={recentReview} /></Reveal>}
          <section aria-label="Design progress summary">
            <Stagger className="progress-grid">
              <StaggerItem><article><span>Total reviews</span><strong>{progress.totalReviews}</strong><p>Critiques saved to Firestore</p></article></StaggerItem>
              <StaggerItem><article className="metric-violet"><span>Average score</span><strong>{progress.averageScore}<small>/10</small></strong><p>{progress.scoreChange === null ? "Build a baseline with one more review" : `${progress.scoreChange >= 0 ? "+" : ""}${progress.scoreChange} since your first review`}</p></article></StaggerItem>
              <StaggerItem><article><span>Strongest area</span><strong className="metric-word">{progress.strongest?.label}</strong><p>{progress.strongest?.score}/10 average</p></article></StaggerItem>
              <StaggerItem><article className="metric-coral"><span>Practice next</span><strong className="metric-word">{progress.weakest?.label}</strong><p>{progress.weakest?.score}/10 average</p></article></StaggerItem>
            </Stagger>
          </section>
          <Reveal delay={0.12}>
            <section className="learning-card"><Sparkles /><div><span className="mono-label">PERSONALIZED PRACTICE</span><h2>One useful constraint.</h2><p>{progress.lesson}</p>{progress.insights.length > 0 && <ul className="insight-list">{progress.insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>}</div><Link href="/review/new">Practice with a new design <ArrowRight /></Link></section>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="dashboard-section-title"><div><p className="eyebrow">Recent critiques</p><h2>Keep the thread.</h2></div><span>{reviews.length} saved in Firestore</span></div>
          </Reveal>
          <Stagger className="review-history">{reviews.map((review) => <StaggerItem key={review.id}><article className="history-card" id={`review-${review.id}`}><span>{review.category ?? "Design review"}</span><strong>{review.overallScore}<small>/10</small></strong><p>{review.summary}</p><time>{new Date(review.createdAt).toLocaleDateString()}</time></article></StaggerItem>)}</Stagger>
        </>
      )}

      <DataControls reviewCount={reviews.length} />
    </main>
  );
}

function toStoredReview(id: string, data: DocumentData): StoredReview | null {
  const candidate = data.review ?? data;
  const parsed = reviewOutputSchema.safeParse({ ...candidate, id: candidate.id ?? id });
  if (!parsed.success) return null;
  const category = typeof data.category === "string" && data.category in categoryLabels
    ? categoryLabels[data.category as keyof typeof categoryLabels]
    : undefined;
  return { ...parsed.data, category };
}

function toStoredDraft(id: string, data: DocumentData): StoredDraft | null {
  const parsed = reviewDraftSchema.safeParse(data);
  if (!parsed.success) return null;

  return {
    ...parsed.data,
    id,
    updatedAtMs: toMillis(data.updatedAt),
  };
}

function toMillis(value: unknown) {
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis() as number;
  }
  if (typeof value === "string") return Date.parse(value);
  return null;
}

function getDraftTitle(draft: ReviewDraft) {
  return draft.brief.goal.trim() || draft.brief.purpose.trim() || `${categoryLabels[draft.category]} critique draft`;
}
