"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { collection, limit, onSnapshot, query, where, type DocumentData } from "firebase/firestore";
import { getRecentReviewSummary } from "@/domain/dashboard-review";
import { calculateProgress, type ProgressReview } from "@/domain/progress";
import { categoryLabels, reviewOutputSchema, type ReviewOutput } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";
import { getFirebaseClientFirestore } from "@/lib/firebase/client";
import { DataControls } from "./data-controls";
import { RecentReviewPanel } from "./recent-review-panel";

type StoredReview = ReviewOutput & ProgressReview & { category?: string };

export function Dashboard() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<StoredReview[]>([]);
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

  if (!user) return null;

  const progress = calculateProgress(reviews);
  const recentReview = getRecentReviewSummary(reviews);

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Your design practice</p>
          <h1>Progress,<br />not perfection.</h1>
        </div>
        <Link className="button" href="/review/new">New review <ArrowRight /></Link>
      </div>
      <div className="workspace-badge">
        <ShieldCheck />
        <div>
          <strong>Private signed-in workspace</strong>
          <span>{user.email ?? user.displayName ?? "Your Firebase account"} is connected.</span>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-empty">
          <div><LoaderCircle className="spin" size={38} /><h2>Loading reviews</h2><p>Fetching your Firestore review history.</p></div>
        </div>
      ) : loadError ? (
        <div className="dashboard-empty">
          <div><LayoutDashboard size={38} /><h2>Could not load reviews</h2><p>{loadError}</p></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="dashboard-empty">
          <div><LayoutDashboard size={38} /><h2>No reviews yet</h2><p>Your dashboard becomes useful after the first critique—no fake charts, no invented progress.</p><Link className="button button-dark" href="/review/new">Review a design <Sparkles /></Link></div>
        </div>
      ) : (
        <>
          {recentReview && <RecentReviewPanel review={recentReview} />}
          <section className="progress-grid" aria-label="Design progress summary">
            <article><span>Total reviews</span><strong>{progress.totalReviews}</strong><p>Critiques saved to Firestore</p></article>
            <article className="metric-violet"><span>Average score</span><strong>{progress.averageScore}<small>/10</small></strong><p>{progress.scoreChange === null ? "Build a baseline with one more review" : `${progress.scoreChange >= 0 ? "+" : ""}${progress.scoreChange} since your first review`}</p></article>
            <article><span>Strongest area</span><strong className="metric-word">{progress.strongest?.label}</strong><p>{progress.strongest?.score}/10 average</p></article>
            <article className="metric-coral"><span>Practice next</span><strong className="metric-word">{progress.weakest?.label}</strong><p>{progress.weakest?.score}/10 average</p></article>
          </section>
          <section className="learning-card"><Sparkles /><div><span className="mono-label">PERSONALIZED PRACTICE</span><h2>One useful constraint.</h2><p>{progress.lesson}</p></div><Link href="/review/new">Practice with a new design <ArrowRight /></Link></section>
          <div className="dashboard-section-title"><div><p className="eyebrow">Recent critiques</p><h2>Keep the thread.</h2></div><span>{reviews.length} saved in Firestore</span></div>
          <div className="review-history">{reviews.map((review) => <article className="history-card" id={`review-${review.id}`} key={review.id}><span>{review.category ?? "Design review"}</span><strong>{review.overallScore}<small>/10</small></strong><p>{review.summary}</p><time>{new Date(review.createdAt).toLocaleDateString()}</time></article>)}</div>
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
