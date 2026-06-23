"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileImage, FileText, LayoutDashboard, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { collection, limit, onSnapshot, query, where, type DocumentData } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { getRecentReviewSummary } from "@/domain/dashboard-review";
import { calculateProgress, type ProgressReview } from "@/domain/progress";
import { reviewDraftSchema, type ReviewDraft } from "@/domain/review-draft";
import { categoryLabels, reviewOutputSchema, reviewSourceImageSchema, type ReviewOutput, type ReviewSourceImage } from "@/domain/review";
import { reviewSyncResponseSchema } from "@/domain/review-storage";
import { useAuth } from "@/features/auth/auth-provider";
import { postJsonWithFallback } from "@/lib/api-client";
import { getFirebaseClientFirestore } from "@/lib/firebase/firestore";
import { getFirebaseClientStorage } from "@/lib/firebase/storage";
import { cacheReviewDocument, getCachedReviewDocuments, getPendingLocalReviewDocuments, type StoredReviewDocument } from "@/lib/review-persistence";
import { DataControls } from "./data-controls";
import { RecentReviewPanel } from "./recent-review-panel";

type StoredReview = ReviewOutput & ProgressReview & { category?: string; sourceImage?: ReviewSourceImage; syncState?: StoredReviewDocument["syncState"] };
type StoredDraft = ReviewDraft & { id: string; updatedAtMs: number | null };

export function Dashboard() {
  const { user } = useAuth();
  const [cloudReviews, setCloudReviews] = useState<StoredReview[]>([]);
  const [cachedReviews, setCachedReviews] = useState<StoredReview[]>([]);
  const [drafts, setDrafts] = useState<StoredDraft[]>([]);
  const [reviewImageUrls, setReviewImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;

    function refreshCachedReviews() {
      if (!active || !user) return;
      setCachedReviews(readCachedStoredReviews(user.uid));
    }

    async function syncPendingReviews() {
      if (!user) return;
      const pendingDocuments = getPendingLocalReviewDocuments(user.uid);
      if (pendingDocuments.length === 0) {
        refreshCachedReviews();
        return;
      }

      try {
        const idToken = await user.getIdToken();
        await syncLocalReviewDocuments(idToken, pendingDocuments);
      } catch {
        // Keep pending reviews cached locally; the next dashboard visit or online event retries.
      } finally {
        refreshCachedReviews();
      }
    }

    const refreshTimer = window.setTimeout(() => {
      refreshCachedReviews();
      void syncPendingReviews();
    }, 0);
    window.addEventListener("online", syncPendingReviews);

    return () => {
      active = false;
      window.clearTimeout(refreshTimer);
      window.removeEventListener("online", syncPendingReviews);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => setReviewImageUrls({}));
      return;
    }

    const reviewsWithImages = mergeStoredReviews(cloudReviews, cachedReviews).filter((review) => review.sourceImage);
    if (reviewsWithImages.length === 0) {
      queueMicrotask(() => setReviewImageUrls({}));
      return;
    }

    let active = true;
    void Promise.all(reviewsWithImages.map(async (review) => {
      if (!review.sourceImage) return null;
      try {
        const url = await getDownloadURL(ref(getFirebaseClientStorage(), review.sourceImage.storagePath));
        return [review.id, url] as const;
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
  }, [cachedReviews, cloudReviews, user]);

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
        setCloudReviews(nextReviews);
        setLoading(false);
      },
      (error) => {
        setLoadError(error.message);
        setCloudReviews([]);
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

  const reviews = mergeStoredReviews(cloudReviews, cachedReviews);
  const progress = calculateProgress(reviews);
  const recentReview = getRecentReviewSummary(reviews);
  const hasCachedOnlyReviews = cachedReviews.some((cachedReview) => cachedReview.syncState === "local" && !cloudReviews.some((cloudReview) => cloudReview.id === cachedReview.id));
  const hasPrivateSourceImages = reviews.some((review) => review.sourceImage);

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
            <span>{user.email ?? user.displayName ?? "Your Firebase account"} is connected. {hasPrivateSourceImages ? "Saved source images are loaded from private account storage." : "New saved critiques will keep their source image in account storage."}</span>
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
            <div><LoaderCircle className="spin" size={38} /><h2>Loading reviews</h2><p>Fetching your private review history.</p></div>
          </div>
        </Reveal>
      ) : loadError && reviews.length === 0 ? (
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
          {hasCachedOnlyReviews && (
            <Reveal delay={0.09}>
              <div className="workspace-badge workspace-badge-muted">
                <ShieldCheck />
                <div>
                  <strong>Saved locally, waiting for account sync</strong>
                  <span>Your latest critique is available here. IroGuide will keep syncing it to your account automatically.</span>
                </div>
              </div>
            </Reveal>
          )}
          <section aria-label="Design progress summary">
            <Stagger className="progress-grid">
              <StaggerItem><article><span>Total reviews</span><strong>{progress.totalReviews}</strong><p>Critiques saved to your workspace</p></article></StaggerItem>
              <StaggerItem><article className="metric-violet"><span>Average score</span><strong>{progress.averageScore}<small>/10</small></strong><p>{progress.scoreChange === null ? "Build a baseline with one more review" : `${progress.scoreChange >= 0 ? "+" : ""}${progress.scoreChange} since your first review`}</p></article></StaggerItem>
              <StaggerItem><article><span>Strongest area</span><strong className="metric-word">{progress.strongest?.label}</strong><p>{progress.strongest?.score}/10 average</p></article></StaggerItem>
              <StaggerItem><article className="metric-coral"><span>Practice next</span><strong className="metric-word">{progress.weakest?.label}</strong><p>{progress.weakest?.score}/10 average</p></article></StaggerItem>
            </Stagger>
          </section>
          <Reveal delay={0.12}>
            <section className="learning-card"><Sparkles /><div><span className="mono-label">PERSONALIZED PRACTICE</span><h2>One useful constraint.</h2><p>{progress.lesson}</p>{progress.insights.length > 0 && <ul className="insight-list">{progress.insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>}</div><Link href="/review/new">Practice with a new design <ArrowRight /></Link></section>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="dashboard-section-title"><div><p className="eyebrow">Recent critiques</p><h2>Keep the thread.</h2></div><span>{reviews.length} saved</span></div>
          </Reveal>
          <Stagger className="review-history">{reviews.map((review) => <StaggerItem key={review.id}><article className="history-card" id={`review-${review.id}`}>
            {review.sourceImage && (
              <div className="history-card-image">
                {reviewImageUrls[review.id] ? <Image src={reviewImageUrls[review.id]} alt={`${review.category ?? "Design"} source image`} fill unoptimized /> : <FileImage />}
              </div>
            )}
            <span>{review.category ?? "Design review"}</span><strong>{review.overallScore}<small>/10</small></strong><p>{review.summary}</p><time>{new Date(review.createdAt).toLocaleDateString()}</time>
          </article></StaggerItem>)}</Stagger>
        </>
      )}

      <DataControls reviewCount={reviews.length} hasLocalFallback={hasCachedOnlyReviews} />
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
  const parsedSourceImage = reviewSourceImageSchema.safeParse(data.sourceImage);
  const syncState = data.syncState === "local" || data.syncState === "cloud" ? data.syncState : undefined;
  return {
    ...parsed.data,
    category,
    ...(parsedSourceImage.success ? { sourceImage: parsedSourceImage.data } : {}),
    syncState,
  };
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

function toStoredCachedReview(data: ReturnType<typeof getCachedReviewDocuments>[number]): StoredReview | null {
  return toStoredReview(data.id, data);
}

function readCachedStoredReviews(userId: string) {
  return getCachedReviewDocuments(userId).map(toStoredCachedReview).filter((review): review is StoredReview => review !== null);
}

async function syncLocalReviewDocuments(idToken: string, documents: StoredReviewDocument[]) {
  if (documents.length === 0) return;
  const payload = await postJsonWithFallback({
    path: "/api/reviews/sync",
    unavailableMessage: "Review sync is not available right now.",
    failureMessage: "Review sync failed.",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documents }),
    },
  });
  const syncResult = reviewSyncResponseSchema.parse(payload);
  const syncedIds = new Set(syncResult.savedIds);
  const sourceImagesById = new Map(syncResult.sourceImages.map((item) => [item.id, item.sourceImage]));

  for (const reviewDocument of documents) {
    if (syncedIds.has(reviewDocument.id)) {
      const sourceImage = sourceImagesById.get(reviewDocument.id) ?? reviewDocument.sourceImage;
      cacheReviewDocument({
        ...reviewDocument,
        ...(sourceImage ? { sourceImage } : {}),
        syncState: "cloud",
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

function mergeStoredReviews(cloudReviews: StoredReview[], cachedReviews: StoredReview[]) {
  const byId = new Map<string, StoredReview>();
  for (const review of cachedReviews) byId.set(review.id, review);
  for (const review of cloudReviews) byId.set(review.id, review);

  return [...byId.values()]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 12);
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
