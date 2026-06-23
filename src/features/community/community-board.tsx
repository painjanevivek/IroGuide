"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, Heart, LoaderCircle, MessageSquareText, Send, ShieldCheck, Sparkles } from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { communityCommentSchema, communityPostSchema, type CommunityPostInput } from "@/domain/community";
import { categoryLabels, reviewOutputSchema, type ReviewCategory, type ReviewOutput } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";
import { getFirebaseClientFirestore } from "@/lib/firebase/client";

type SavedReview = {
  savedDocId: string;
  category: ReviewCategory | "other";
  categoryLabel: string;
  review: ReviewOutput;
};

type CommunityPost = CommunityPostInput & {
  id: string;
  createdAtMs: number;
};

type CommunityComment = {
  id: string;
  authorName: string;
  body: string;
  createdAtMs: number;
};

const fallbackPosts: CommunityPost[] = [
  {
    id: "sample-identity",
    authorId: "sample",
    authorName: "Anika Rao",
    reviewId: "sample-identity",
    title: "A quieter identity for a noisy category",
    note: "The tighter symbol-to-wordmark relationship made the system feel intentional at every size.",
    category: "Brand identity",
    visibility: "public",
    stats: { comments: 2 },
    createdAtMs: Date.now() - 1000 * 60 * 60 * 24,
    review: makeSampleReview("sample-identity", 8.2, "The brand identity has a stronger foundation after simplifying the first read."),
  },
  {
    id: "sample-editorial",
    authorId: "sample",
    authorName: "Milo Chen",
    reviewId: "sample-editorial",
    title: "Independent culture, set in motion",
    note: "Strong energy. The date and venue still need a calmer secondary reading zone.",
    category: "Editorial",
    visibility: "public",
    stats: { comments: 1 },
    createdAtMs: Date.now() - 1000 * 60 * 60 * 48,
    review: makeSampleReview("sample-editorial", 7.6, "The editorial poster has strong motion, but the supporting details need calmer hierarchy."),
  },
  {
    id: "sample-product",
    authorId: "sample",
    authorName: "Nora Studio",
    reviewId: "sample-product",
    title: "Rethinking the first-run workspace",
    note: "Progressive disclosure keeps the interface capable without making the first session feel dense.",
    category: "Product UI",
    visibility: "public",
    stats: { comments: 3 },
    createdAtMs: Date.now() - 1000 * 60 * 60 * 72,
    review: makeSampleReview("sample-product", 8.7, "The product UI feels more approachable when advanced controls arrive later."),
  },
];

export function CommunityBoard() {
  const { user, avatarUrl } = useAuth();
  const [savedReviews, setSavedReviews] = useState<SavedReview[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const db = getFirebaseClientFirestore();
    const postsQuery = query(collection(db, "communityPosts"), where("visibility", "==", "public"), limit(40));

    return onSnapshot(
      postsQuery,
      (snapshot) => {
        const nextPosts = snapshot.docs
          .map((postDoc) => toCommunityPost(postDoc.id, postDoc.data()))
          .filter((post): post is CommunityPost => post !== null)
          .sort((left, right) => right.createdAtMs - left.createdAtMs);
        setPosts(nextPosts);
        setLoadingPosts(false);
      },
      () => {
        setPosts([]);
        setLoadingPosts(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const db = getFirebaseClientFirestore();
    const reviewsQuery = query(collection(db, "reviews"), where("userId", "==", user.uid), limit(30));

    return onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const nextReviews = snapshot.docs
          .map((reviewDoc) => toSavedReview(reviewDoc.id, reviewDoc.data()))
          .filter((review): review is SavedReview => review !== null)
          .sort((left, right) => Date.parse(right.review.createdAt) - Date.parse(left.review.createdAt));
        setSavedReviews(nextReviews);
        setSelectedReviewId((current) => current || nextReviews[0]?.savedDocId || "");
        setLoadingSaved(false);
      },
      () => {
        setSavedReviews([]);
        setLoadingSaved(false);
      },
    );
  }, [user]);

  const selectedReview = useMemo(
    () => savedReviews.find((review) => review.savedDocId === selectedReviewId) ?? null,
    [savedReviews, selectedReviewId],
  );

  async function publishPost(event: FormEvent) {
    event.preventDefault();
    if (!user || !selectedReview || publishing) return;
    setError("");
    setMessage("");

    const parsed = communityPostSchema.safeParse({
      authorId: user.uid,
      authorName: user.displayName || user.email?.split("@")[0] || "IroGuide designer",
      authorAvatarUrl: avatarUrl || user.photoURL || undefined,
      reviewId: selectedReview.savedDocId,
      title: title.trim() || getDefaultTitle(selectedReview.review.summary),
      note: note.trim() || undefined,
      category: selectedReview.categoryLabel,
      visibility: "public",
      review: selectedReview.review,
      stats: { comments: 0 },
    });

    if (!parsed.success) {
      setError("Choose a saved critique and add a clear title before posting.");
      return;
    }

    if (!consent) {
      setError("Confirm that this selected critique can be visible in Community.");
      return;
    }

    setPublishing(true);
    try {
      await addDoc(collection(getFirebaseClientFirestore(), "communityPosts"), {
        ...parsed.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setMessage("Posted to Community.");
      setNote("");
      setConsent(false);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish this critique.");
    } finally {
      setPublishing(false);
    }
  }

  const visiblePosts = posts.length > 0 ? posts : fallbackPosts;

  return (
    <section className="community-board section-pad" aria-labelledby="community-board-title">
      <div className="community-section-title">
        <div><p className="eyebrow">Live critique board</p><h2 id="community-board-title">Share selectively.<br />Discuss openly.</h2></div>
        <p>Publish only the saved critiques you choose. Designers can read the review context, compare notes, and leave structured comments.</p>
      </div>

      <div className="community-publish-panel">
        <div>
          <p className="eyebrow"><ShieldCheck /> Private by default</p>
          <h3>Post one saved critique.</h3>
          <p>Your private dashboard remains private. This form only publishes the critique you select here.</p>
        </div>
        {!user ? (
          <div className="community-signed-out">
            <strong>Sign in to publish and comment.</strong>
            <Link className="button button-lime" href="/auth?mode=sign-up">Join Community <Sparkles /></Link>
          </div>
        ) : loadingSaved ? (
          <div className="community-signed-out"><LoaderCircle className="spin" /><strong>Loading saved critiques</strong></div>
        ) : savedReviews.length === 0 ? (
          <div className="community-signed-out">
            <strong>No saved critiques yet.</strong>
            <p>Run a private critique, save it, then choose whether it belongs in Community.</p>
            <Link className="button button-lime" href="/review/new">Create private critique <Sparkles /></Link>
          </div>
        ) : (
          <form className="community-publish-form" onSubmit={publishPost}>
            <label>
              <span>Saved critique</span>
              <select value={selectedReviewId} onChange={(event) => { setSelectedReviewId(event.target.value); setTitle(""); }}>
                {savedReviews.map((savedReview) => (
                  <option key={savedReview.savedDocId} value={savedReview.savedDocId}>
                    {savedReview.categoryLabel} - {savedReview.review.overallScore}/10 - {new Date(savedReview.review.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Post title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder={selectedReview ? getDefaultTitle(selectedReview.review.summary) : "What changed after this critique?"} />
            </label>
            <label>
              <span>Context note</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={420} rows={3} placeholder="What should other designers notice or respond to?" />
            </label>
            {selectedReview && <ReviewSharePreview savedReview={selectedReview} />}
            <label className="community-consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span><Check /> I understand this publishes the selected critique summary, score, issues, and my note to Community.</span>
            </label>
            <button className="button button-lime" type="submit" disabled={publishing}>{publishing ? "Posting..." : <>Post to Community <Send size={16} /></>}</button>
            {message && <p className="form-success" role="status">{message}</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
          </form>
        )}
      </div>

      {loadingPosts ? (
        <div className="community-feed-state"><LoaderCircle className="spin" /><strong>Loading public critiques</strong></div>
      ) : (
        <div className="critique-grid community-live-grid">
          {visiblePosts.map((post, index) => <CommunityPostCard key={post.id} post={post} index={index} />)}
        </div>
      )}
    </section>
  );
}

function ReviewSharePreview({ savedReview }: { savedReview: SavedReview }) {
  const firstIssue = savedReview.review.issues[0];

  return (
    <div className="review-share-preview">
      <span>{savedReview.categoryLabel}</span>
      <strong>{savedReview.review.overallScore}<small>/ 10</small></strong>
      <p>{savedReview.review.summary}</p>
      {firstIssue && <em>{firstIssue.category}: {firstIssue.recommendation}</em>}
    </div>
  );
}

function CommunityPostCard({ post, index }: { post: CommunityPost; index: number }) {
  const color = index % 3 === 0 ? "violet" : index % 3 === 1 ? "lime" : "coral";
  const firstIssue = post.review.issues[0];

  return (
    <article className={`critique-tile tile-${color} community-post-card`}>
      <div className="critique-canvas">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <strong>{formatCanvasTitle(post.title)}</strong>
        <div />
      </div>
      <div className="critique-info">
        <span className="mono-label">{post.category}</span>
        <h3>{post.title}</h3>
        <div className="maker">
          <span>{getInitial(post.authorName)}</span>
          <p>{post.authorName}<small><BadgeCheck /> Published critique</small></p>
          <strong>{post.review.overallScore}<small>/ 10</small></strong>
        </div>
        <blockquote>{post.note || post.review.summary}</blockquote>
        {firstIssue && <p className="community-priority"><strong>{firstIssue.priority} priority</strong>{firstIssue.recommendation}</p>}
        <footer><span><Heart /> Improvement story</span><span><MessageSquareText /> {post.stats.comments} comments</span></footer>
        <CommunityComments postId={post.id} disabled={post.authorId === "sample"} />
      </div>
    </article>
  );
}

function CommunityComments({ postId, disabled }: { postId: string; disabled: boolean }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (disabled) return;
    const db = getFirebaseClientFirestore();

    return onSnapshot(collection(db, "communityPosts", postId, "comments"), (snapshot) => {
      const nextComments = snapshot.docs
        .map((commentDoc) => toCommunityComment(commentDoc.id, commentDoc.data()))
        .filter((comment): comment is CommunityComment => comment !== null)
        .sort((left, right) => left.createdAtMs - right.createdAtMs)
        .slice(-4);
      setComments(nextComments);
    });
  }, [disabled, postId]);

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!user || disabled || submitting) return;
    setError("");
    const parsed = communityCommentSchema.safeParse({
      authorId: user.uid,
      authorName: user.displayName || user.email?.split("@")[0] || "IroGuide designer",
      body,
    });
    if (!parsed.success) {
      setError("Write at least two characters before posting.");
      return;
    }

    setSubmitting(true);
    try {
      const db = getFirebaseClientFirestore();
      await addDoc(collection(db, "communityPosts", postId, "comments"), {
        ...parsed.data,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "communityPosts", postId), {
        "stats.comments": increment(1),
        updatedAt: serverTimestamp(),
      });
      setBody("");
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Could not post this comment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (disabled) {
    return <div className="community-comments"><p className="community-comment-empty">Live comments appear on critiques shared by signed-in users.</p></div>;
  }

  return (
    <div className="community-comments">
      {comments.length > 0 ? comments.map((comment) => (
        <p key={comment.id} className="community-comment"><strong>{comment.authorName}</strong>{comment.body}</p>
      )) : <p className="community-comment-empty">Start the critique thread.</p>}
      {user ? (
        <form onSubmit={submitComment} className="community-comment-form">
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} maxLength={500} placeholder="Add a specific, useful comment..." />
          <button type="submit" disabled={submitting} aria-label="Post comment"><Send size={15} /></button>
        </form>
      ) : (
        <Link className="community-comment-login" href="/auth?mode=sign-up">Sign in to comment</Link>
      )}
      {error && <p className="community-comment-error" role="alert">{error}</p>}
    </div>
  );
}

function toSavedReview(id: string, data: DocumentData): SavedReview | null {
  const candidate = data.review ?? data;
  const parsed = reviewOutputSchema.safeParse({ ...candidate, id: candidate.id ?? id });
  if (!parsed.success) return null;
  const category = typeof data.category === "string" && data.category in categoryLabels ? data.category as ReviewCategory : "other";

  return {
    savedDocId: id,
    category,
    categoryLabel: categoryLabels[category],
    review: parsed.data,
  };
}

function toCommunityPost(id: string, data: DocumentData): CommunityPost | null {
  const parsed = communityPostSchema.safeParse(data);
  if (!parsed.success) return null;

  return {
    ...parsed.data,
    id,
    createdAtMs: toMillis(data.createdAt) ?? Date.parse(parsed.data.review.createdAt),
  };
}

function toCommunityComment(id: string, data: DocumentData): CommunityComment | null {
  const body = typeof data.body === "string" ? data.body.trim() : "";
  const authorName = typeof data.authorName === "string" ? data.authorName : "Designer";
  if (body.length < 2) return null;

  return {
    id,
    authorName,
    body,
    createdAtMs: toMillis(data.createdAt) ?? 0,
  };
}

function toMillis(value: unknown) {
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis() as number;
  }
  if (typeof value === "string") return Date.parse(value);
  return null;
}

function getDefaultTitle(summary: string) {
  return summary.split(".")[0].slice(0, 120);
}

function formatCanvasTitle(title: string) {
  const words = title.split(" ");
  const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(" ");
  const secondLine = words.slice(Math.ceil(words.length / 2)).join(" ");

  return <>{firstLine}<br /><em>{secondLine}</em></>;
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "I";
}

function makeSampleReview(id: string, score: number, summary: string): ReviewOutput {
  return {
    id,
    createdAt: new Date().toISOString(),
    overallScore: score,
    summary,
    strengths: ["Specific context made the critique easier to apply."],
    scores: [{ label: "Clarity", score }],
    rubricVersion: "community-sample",
    issues: [{
      id: `${id}-issue`,
      category: "Hierarchy",
      score,
      priority: "medium",
      observation: summary,
      impact: "Other designers can understand the design decision and discuss the tradeoff.",
      recommendation: "Keep comments focused on the decision, its effect, and one possible next move.",
      actions: ["Name what works.", "Suggest one practical change."],
    }],
    annotations: [],
    checklist: [{ label: "Invite one specific response from peers.", priority: "medium" }],
    followUps: ["What should I improve first?"],
    provider: "demo",
  };
}
