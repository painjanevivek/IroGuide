"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, FileImage, FileText, LayoutDashboard, LoaderCircle, ShieldCheck, Sparkles, WifiOff } from "lucide-react";
import { collection, limit, onSnapshot, query, where, type DocumentData } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { getRecentReviewSummary } from "@/domain/dashboard-review";
import { calculateProgress } from "@/domain/progress";
import { reviewDraftSchema, type ReviewDraft } from "@/domain/review-draft";
import { categoryLabels, reviewCategories as allReviewCategories } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";
import { useLaunchCapabilities } from "@/features/capabilities/launch-capabilities-provider";
import { isE2ELocalAuthEnabled } from "@/lib/e2e-local-auth";
import { getFirebaseClientFirestore } from "@/lib/firebase/firestore";
import { getFirebaseClientStorage } from "@/lib/firebase/storage";
import { getProgressCohort, mergeAccountReviews } from "@/lib/account-reviews";
import { captureProductEvidence, getReviewAgeBucket, hashEvidenceSignature } from "@/lib/product-evidence";
import { useAccountReviews } from "@/lib/use-account-reviews";
import { DataControls } from "./data-controls";
import { GuidedNextAction } from "./guided-next-action";
import { RecentReviewPanel } from "./recent-review-panel";
import { useDashboardGuide } from "./use-dashboard-guide";

type StoredDraft = ReviewDraft & { id: string; updatedAtMs: number | null };

export function Dashboard() {
  const { user } = useAuth();
  const { aiCritique, sourceImageStorage } = useLaunchCapabilities();
  const {
    cachedReviews,
    cloudReviews,
    hasCachedOnlyReviews,
    loadError,
    loading,
    reviews,
  } = useAccountReviews({ user });
  const [drafts, setDrafts] = useState<StoredDraft[]>([]);
  const [reviewImageUrls, setReviewImageUrls] = useState<Record<string, string>>({});
  const [online, setOnline] = useState(true);
  const [reviewFilter, setReviewFilter] = useState("all");
  const evidenceUserRef = useRef("");
  const dashboardGuide = useDashboardGuide(user);

  useEffect(() => {
    const updateConnection = () => setOnline(window.navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    if (!user || loading || evidenceUserRef.current === user.uid) return;
    evidenceUserRef.current = user.uid;
    const cohort = getProgressCohort(reviews);

    void captureProductEvidence(user, { name: "workspace_returned", ageBucket: getReviewAgeBucket(user.metadata.creationTime ?? "") });

    void captureProductEvidence(user, {
      name: "review_history_opened",
      eligibleCount: cohort.evidence.length,
      excludedCount: cohort.excludedCount,
    });

    const anchor = cohort.evidence[0];
    if (!anchor || cohort.evidence.length === 0) return;
    void hashEvidenceSignature([
      anchor.category,
      anchor.provider,
      anchor.rubricVersion,
      ...anchor.scores.map((score) => score.label).sort(),
    ]).then((cohortSignature) => captureProductEvidence(user, cohort.evidence.length === 1
      ? { name: "progress_baseline_seen", cohortSignature, sampleCount: 1 }
      : {
          name: "progress_comparable_seen",
          cohortSignature,
          sampleCount: cohort.evidence.length,
          recurringIssueCount: calculateProgress(cohort.evidence).recurringIssues.length,
        }));
  }, [loading, reviews, user]);

  useEffect(() => {
    if (!user || !sourceImageStorage) {
      queueMicrotask(() => setReviewImageUrls({}));
      return;
    }
    if (isE2ELocalAuthEnabled()) {
      queueMicrotask(() => setReviewImageUrls({}));
      return;
    }
    const reviewsWithImages = mergeAccountReviews(cloudReviews, cachedReviews).filter((review) => review.sourceImage);
    if (reviewsWithImages.length === 0) {
      queueMicrotask(() => setReviewImageUrls({}));
      return;
    }

    let active = true;
    void Promise.all(reviewsWithImages.map(async (review) => {
      if (!review.sourceImage) return null;
      try {
        const url = await getDownloadURL(ref(getFirebaseClientStorage(), review.sourceImage.storagePath));
        return [review.documentId, url] as const;
      } catch {
        return null;
      }
    })).then((entries) => {
      if (!active) return;
      setReviewImageUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null)));
    });

    return () => {
      active = false;
    };
  }, [cachedReviews, cloudReviews, sourceImageStorage, user]);

  useEffect(() => {
    if (!user) return;
    if (isE2ELocalAuthEnabled()) {
      queueMicrotask(() => setDrafts([]));
      return;
    }
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

  const progressCohort = getProgressCohort(reviews);
  const progress = calculateProgress(progressCohort.evidence);
  const reviewActionHref: Route = aiCritique ? "/review/new" : "/learn#practice";
  const reviewActionLabel = aiCritique ? "New review" : "Start learning";
  const recentReview = getRecentReviewSummary(reviews);
  const recentReviewDocument = recentReview ? reviews.find((review) => review.id === recentReview.id) : null;
  const hasPrivateSourceImages = reviews.some((review) => review.sourceImage);
  const filteredReviews = reviewFilter === "all" ? reviews : reviews.filter((review) => review.category === reviewFilter);

  return (
    <main className="dashboard-main">
      <Reveal>
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Your design practice</p>
            <h1>Progress,<br />not perfection.</h1>
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="workspace-badge">
          <ShieldCheck />
          <div>
            <strong>Private signed-in workspace</strong>
            <span>{user.email ?? user.displayName ?? "Your Firebase account"} is connected. {!sourceImageStorage ? "Critique text remains available; source-image cloud access is paused during the free launch." : hasPrivateSourceImages ? "Saved source images are loaded from private account storage." : "New saved critiques will keep their source image in account storage."}</span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <GuidedNextAction error={dashboardGuide.error} guide={dashboardGuide.guide} loading={dashboardGuide.loading} offline={!online} onRetry={dashboardGuide.retry} status={dashboardGuide.status} />
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
                  <p>{aiCritique ? draft.file ? `${draft.file.name} was selected. Reselect the image before starting critique.` : "Brief context is saved. Add an image before starting critique." : "Draft context remains saved while new critiques are unavailable."}</p>
                  <div><small>Step {draft.step} / 4</small>{draft.updatedAtMs && <time>{new Date(draft.updatedAtMs).toLocaleDateString()}</time>}</div>
                  <Link className="button button-dark button-small" href={reviewActionHref}>{aiCritique ? "Continue draft" : "Practice with a sample"} <ArrowRight /></Link>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {loading ? (
        <Reveal delay={0.08}>
          <div className="dashboard-empty is-loading">
            <div><LoaderCircle className="spin" size={38} /><h2>Loading reviews</h2><p>Fetching your private review history.</p></div>
          </div>
        </Reveal>
      ) : loadError && reviews.length === 0 && !dashboardGuide.guide ? (
        <Reveal delay={0.08}>
          <div className="dashboard-empty is-error">
            <div><LayoutDashboard size={38} /><h2>Could not load reviews</h2><p>{loadError}</p></div>
          </div>
        </Reveal>
      ) : reviews.length === 0 ? (
        <Reveal delay={0.08}>
          <div className="dashboard-empty is-empty">
            <div><LayoutDashboard size={38} /><h2>Your saved critiques will appear here.</h2><p>{aiCritique ? "Complete an entitled critique to build private review history." : "The free launch starts with learning artifacts. Personalized critique remains paused until the provider gate is approved."}</p><Link className="button button-dark" href={(dashboardGuide.guide?.nextAction.href ?? reviewActionHref) as Route}>{dashboardGuide.guide?.nextAction.label ?? reviewActionLabel} <Sparkles /></Link></div>
          </div>
        </Reveal>
      ) : (
        <>
          {recentReview && recentReviewDocument && <Reveal delay={0.08}><RecentReviewPanel review={recentReview} reviewHref={getReviewDetailHref(recentReviewDocument.documentId)} /></Reveal>}
          {hasCachedOnlyReviews && (
            <Reveal delay={0.09}>
              <div className="workspace-badge workspace-badge-muted">
                <ShieldCheck />
                <div>
                  <strong>Private unverified copy</strong>
                  <span>Your latest critique remains available on this device, but it cannot be published as trusted. Rerun it when account saving is available to create a verified copy.</span>
                </div>
              </div>
            </Reveal>
          )}
          {(loadError || !online) && (
            <Reveal delay={0.095}>
              <div className="workspace-badge workspace-badge-muted" role="status">
                <WifiOff />
                <div><strong>Readable history, partial sync</strong><span>{!online ? "You are offline." : "Cloud history could not refresh."} The saved reviews below remain readable; edits and sync will retry when the connection recovers.</span></div>
              </div>
            </Reveal>
          )}
          {progress.totalReviews > 0 ? <><section aria-label="Design progress summary">
            <Stagger className="progress-grid">
              <StaggerItem><article><span>Comparable reviews</span><strong>{progress.totalReviews}</strong><p>{progressCohort.excludedCount > 0 ? `${progressCohort.excludedCount} incompatible or unverified excluded` : "Server-verified evidence cohort"}</p></article></StaggerItem>
              <StaggerItem><article className="metric-violet"><span>Average score</span><strong>{progress.totalReviews > 0 ? <>{progress.averageScore}<small>/10</small></> : "—"}</strong><p>{progress.totalReviews === 0 ? "No compatible verified evidence" : progress.scoreChange === null ? "Build a baseline with one more review" : `${progress.scoreChange >= 0 ? "+" : ""}${progress.scoreChange} since your first review`}</p></article></StaggerItem>
              <StaggerItem><article><span>Strongest area</span><strong className="metric-word">{progress.strongest?.label ?? "More evidence"}</strong><p>{progress.strongest ? `${progress.strongest.score}/10 compatible average` : "Needs 2 compatible reviews"}</p></article></StaggerItem>
              <StaggerItem><article className="metric-coral"><span>Practice next</span><strong className="metric-word">{progress.weakest?.label ?? "Baseline first"}</strong><p>{progress.weakest ? `${progress.weakest.score}/10 compatible average` : "No unsupported recommendation"}</p></article></StaggerItem>
            </Stagger>
          </section>
          <Reveal delay={0.12}>
            <section className="learning-card"><Sparkles className="sparkle-blink-glow" /><div><span className="mono-label">VERIFIED LEARNING EVIDENCE</span><h2>{progress.evidenceState === "comparable" ? "One useful constraint." : "Build a trustworthy baseline."}</h2><p>{progress.evidenceState === "comparable" ? progress.lesson : progressCohort.reason}</p>{progress.insights.length > 0 && <ul className="insight-list">{progress.insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>}{progress.recurringIssues.length > 0 && <ul className="insight-list">{progress.recurringIssues.map((issue) => <li key={issue.category}>{issue.category} recurred in {issue.count} compatible reviews.</li>)}</ul>}</div><Link href={reviewActionHref}>{aiCritique ? "Practice with a new design" : "Explore example critique"} <ArrowRight /></Link></section>
          </Reveal>
          </> : null}
          <Reveal delay={0.14}>
            <div className="dashboard-section-title" id="recent-reviews"><div><p className="eyebrow">Recent critiques</p><h2>Keep the thread.</h2></div><div className="review-history-tools"><label><span>Filter critiques</span><select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)}><option value="all">All categories</option>{allReviewCategories.map((category) => <option value={category} key={category}>{categoryLabels[category]}</option>)}</select></label><span>{filteredReviews.length} of {reviews.length} shown</span></div></div>
          </Reveal>
          {filteredReviews.length === 0 ? <div className="dashboard-filter-empty"><strong>No critiques match this filter.</strong><button type="button" onClick={() => setReviewFilter("all")}>Clear filter</button></div> : <Stagger className="review-history">{filteredReviews.map((review) => <StaggerItem key={review.documentId}><Link className="history-card" href={getReviewDetailHref(review.documentId)} id={`review-${review.id}`} aria-label={`Open full critique for ${review.category ?? "design review"} scored ${review.overallScore} out of 10`}>
            {review.sourceImage && (
              <div className="history-card-image">
                {reviewImageUrls[review.documentId] ? <Image src={reviewImageUrls[review.documentId]} alt={`${review.category ?? "Design"} source image`} fill unoptimized /> : <FileImage />}
              </div>
            )}
            <span>{review.category ?? "Design review"}</span>
            <span className={`review-trust-badge is-${review.trustState}`}>{review.trustState === "server-verified" ? "Verified" : "Unverified import"}</span>
            <strong>{review.overallScore}<small>/10</small></strong><p>{review.summary}</p><time>{new Date(review.createdAt).toLocaleDateString()}</time>
          </Link></StaggerItem>)}</Stagger>}
        </>
      )}

      <DataControls reviewCount={reviews.length} hasLocalFallback={hasCachedOnlyReviews} sourceImageStorage={sourceImageStorage} />
    </main>
  );
}

function getReviewDetailHref(documentId: string) {
  return `/dashboard/reviews/${encodeURIComponent(documentId)}` as Route;
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
