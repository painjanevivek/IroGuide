"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Check,
  Heart,
  Home,
  LoaderCircle,
  MessageSquareText,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { communityCommentSchema, communityPostSchema, type CommunityPostInput } from "@/domain/community";
import { categoryLabels, reviewOutputSchema, type ReviewCategory, type ReviewOutput } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";
import { getFirebaseClientFirestore } from "@/lib/firebase/firestore";

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

type CommunityView = "home" | "profile" | "notifications" | "saved";

type PostInteraction = {
  liked: boolean;
  saved: boolean;
  shared: boolean;
};

type InteractionMap = Record<string, PostInteraction>;
type CommentMap = Record<string, CommunityComment[]>;
type PendingInteractionMap = Record<string, Partial<Record<keyof PostInteraction, boolean>>>;

type CommunityNotification = {
  id: string;
  title: string;
  body: string;
  createdAtMs: number;
};

const interactionStorageKey = "iroguide-community-interactions";
const sampleCommentStorageKey = "iroguide-community-sample-comments";
const emptyInteraction: PostInteraction = { liked: false, saved: false, shared: false };

const navigationItems: Array<{ id: CommunityView; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "saved", label: "Saved", icon: Bookmark },
];

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
    stats: { comments: 2, likes: 18, saves: 7 },
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
    stats: { comments: 1, likes: 12, saves: 4 },
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
    stats: { comments: 3, likes: 24, saves: 11 },
    createdAtMs: Date.now() - 1000 * 60 * 60 * 72,
    review: makeSampleReview("sample-product", 8.7, "The product UI feels more approachable when advanced controls arrive later."),
  },
];

export function CommunityBoard() {
  const { user, avatarUrl } = useAuth();
  const [activeView, setActiveView] = useState<CommunityView>("home");
  const [savedReviews, setSavedReviews] = useState<SavedReview[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [interactions, setInteractions] = useState<InteractionMap>({});
  const [pendingInteractions, setPendingInteractions] = useState<PendingInteractionMap>({});
  const [sampleComments, setSampleComments] = useState<CommentMap>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [interactionsReady, setInteractionsReady] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setInteractions(readStoredInteractions());
      setSampleComments(readStoredSampleComments());
      setInteractionsReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!interactionsReady) {
      return;
    }
    writeStoredInteractions(interactions);
  }, [interactions, interactionsReady]);

  useEffect(() => {
    if (!interactionsReady) {
      return;
    }
    writeStoredSampleComments(sampleComments);
  }, [sampleComments, interactionsReady]);

  useEffect(() => {
    if (!user || posts.length === 0) {
      return;
    }

    let active = true;
    const db = getFirebaseClientFirestore();

    void Promise.all(posts.filter((post) => !isSamplePost(post)).map(async (post) => {
      const snapshot = await getDoc(doc(db, "communityPosts", post.id, "interactions", user.uid));
      return [post.id, toPostInteraction(snapshot.data())] as const;
    })).then((entries) => {
      if (!active || entries.length === 0) return;
      setInteractions((current) => ({ ...current, ...toInteractionMap(entries) }));
    }).catch(() => {
      if (!active) return;
      setShareMessage("Community reactions are available locally until the live feed reconnects.");
    });

    return () => {
      active = false;
    };
  }, [posts, user]);

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
  const visiblePosts = posts.length > 0 ? posts : fallbackPosts;
  const myPosts = user ? visiblePosts.filter((post) => post.authorId === user.uid) : [];
  const savedPosts = visiblePosts.filter((post) => interactions[post.id]?.saved);
  const notifications = useMemo(() => getNotifications(visiblePosts, interactions), [interactions, visiblePosts]);
  const currentFeed = activeView === "profile" ? myPosts : activeView === "saved" ? savedPosts : visiblePosts;

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
      stats: { comments: 0, likes: 0, saves: 0 },
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
      setTitle("");
      setConsent(false);
      setActiveView("profile");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish this critique.");
    } finally {
      setPublishing(false);
    }
  }

  async function toggleInteraction(post: CommunityPost, key: keyof PostInteraction) {
    const existing = interactions[post.id] ?? emptyInteraction;
    const nextValue = !existing[key];

    setInteractions((current) => {
      const currentPostInteraction = current[post.id] ?? emptyInteraction;
      return { ...current, [post.id]: { ...currentPostInteraction, [key]: nextValue } };
    });

    if (isSamplePost(post)) {
      setShareMessage(getLocalInteractionMessage(key));
      return;
    }

    if (!user) {
      setShareMessage("Sign in to keep community reactions across devices.");
      return;
    }

    setPendingInteractions((current) => setPendingInteraction(current, post.id, key, true));

    try {
      await persistPostInteraction(post.id, user.uid, key, nextValue);
      setShareMessage(getPersistedInteractionMessage(key, nextValue));
    } catch (interactionError) {
      setInteractions((current) => {
        const currentPostInteraction = current[post.id] ?? emptyInteraction;
        return { ...current, [post.id]: { ...currentPostInteraction, [key]: existing[key] } };
      });
      setShareMessage(interactionError instanceof Error ? interactionError.message : "Could not update this community action.");
    } finally {
      setPendingInteractions((current) => setPendingInteraction(current, post.id, key, false));
    }
  }

  async function sharePost(post: CommunityPost) {
    const href = `${window.location.origin}${window.location.pathname}#${post.id}`;
    const shareData = {
      title: post.title,
      text: `${post.authorName} shared an IroGuide critique: ${post.title}`,
      url: href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Community post shared.");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(href);
        setShareMessage("Community link copied.");
      } else {
        setShareMessage(`Copy this community link: ${href}`);
      }
      setInteractions((current) => {
        const existing = current[post.id] ?? emptyInteraction;
        return { ...current, [post.id]: { ...existing, shared: true } };
      });
      if (user && !isSamplePost(post)) {
        await persistPostInteraction(post.id, user.uid, "shared", true);
      }
    } catch {
      setShareMessage("Could not copy this link.");
    }
  }

  function openComments(postId: string) {
    setExpandedComments((current) => ({ ...current, [postId]: true }));
    window.requestAnimationFrame(() => {
      const comments = document.getElementById(`comments-${postId}`);
      comments?.scrollIntoView({ behavior: "smooth", block: "center" });
      comments?.querySelector("textarea")?.focus();
    });
  }

  function addSampleComment(postId: string, comment: CommunityComment) {
    setSampleComments((current) => ({
      ...current,
      [postId]: [...(current[postId] ?? []), comment].slice(-12),
    }));
  }

  return (
    <section className="community-board section-pad" aria-labelledby="community-board-title">
      <div className="community-section-title">
        <div><p className="eyebrow">Social critique workspace</p><h2 id="community-board-title">Share selectively.<br />Discuss openly.</h2></div>
        <p>Publish only the saved critiques you choose. Designers can read review context, save useful examples, and leave structured comments.</p>
      </div>

      <div className="community-social-shell">
        <aside className="community-social-rail" aria-label="Community sections">
          <div>
            <span className="mono-label">Community</span>
            <strong>{user?.displayName || user?.email?.split("@")[0] || "Design feed"}</strong>
          </div>
          <nav>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" className={activeView === item.id ? "active" : ""} onClick={() => setActiveView(item.id)}>
                  <Icon size={17} />
                  {item.label}
                  {item.id === "notifications" && notifications.length > 0 && <span>{notifications.length}</span>}
                  {item.id === "saved" && savedPosts.length > 0 && <span>{savedPosts.length}</span>}
                </button>
              );
            })}
          </nav>
          <div className="community-rail-card">
            <ShieldCheck />
            <strong>Private first</strong>
            <p>Only selected saved critiques can become public posts.</p>
            <Link href="/review/new">Start a critique</Link>
          </div>
        </aside>

        <div className="community-social-main">
          {activeView !== "notifications" && (
            <CommunityComposer
              consent={consent}
              error={error}
              loadingSaved={loadingSaved}
              message={message}
              note={note}
              onConsentChange={setConsent}
              onNoteChange={setNote}
              onPublish={publishPost}
              onReviewChange={(value) => {
                setSelectedReviewId(value);
                setTitle("");
              }}
              onTitleChange={setTitle}
              publishing={publishing}
              savedReviews={savedReviews}
              selectedReview={selectedReview}
              selectedReviewId={selectedReviewId}
              title={title}
              userSignedIn={Boolean(user)}
            />
          )}

          {shareMessage && <p className="community-share-state" role="status">{shareMessage}</p>}

          {activeView === "notifications" ? (
            <NotificationPanel notifications={notifications} />
          ) : loadingPosts ? (
            <div className="community-feed-state"><LoaderCircle className="spin" /><strong>Loading public critiques</strong></div>
          ) : currentFeed.length === 0 ? (
            <EmptyCommunityState activeView={activeView} />
          ) : (
            <div className="community-feed-list">
              {currentFeed.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  expandedComments={Boolean(expandedComments[post.id])}
                  interaction={interactions[post.id] ?? emptyInteraction}
                  isLocalOnly={!user || isSamplePost(post)}
                  localComments={sampleComments[post.id] ?? []}
                  onAddLocalComment={addSampleComment}
                  onOpenComments={openComments}
                  onShare={() => void sharePost(post)}
                  onToggleInteraction={toggleInteraction}
                  pendingInteraction={pendingInteractions[post.id] ?? {}}
                  post={post}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CommunityComposer({
  consent,
  error,
  loadingSaved,
  message,
  note,
  onConsentChange,
  onNoteChange,
  onPublish,
  onReviewChange,
  onTitleChange,
  publishing,
  savedReviews,
  selectedReview,
  selectedReviewId,
  title,
  userSignedIn,
}: {
  consent: boolean;
  error: string;
  loadingSaved: boolean;
  message: string;
  note: string;
  onConsentChange: (value: boolean) => void;
  onNoteChange: (value: string) => void;
  onPublish: (event: FormEvent) => void;
  onReviewChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  publishing: boolean;
  savedReviews: SavedReview[];
  selectedReview: SavedReview | null;
  selectedReviewId: string;
  title: string;
  userSignedIn: boolean;
}) {
  if (!userSignedIn) {
    return (
      <div className="community-composer signed-out">
        <strong>Sign in to publish and comment.</strong>
        <p>Your private critiques stay private until you choose one to share.</p>
        <Link className="button button-lime" href="/auth?mode=sign-up">Join Community <Sparkles /></Link>
      </div>
    );
  }

  if (loadingSaved) {
    return <div className="community-composer signed-out"><LoaderCircle className="spin" /><strong>Loading saved critiques</strong></div>;
  }

  if (savedReviews.length === 0) {
    return (
      <div className="community-composer signed-out">
        <strong>No saved critiques yet.</strong>
        <p>Run a private critique, save it, then choose whether it belongs in Community.</p>
        <Link className="button button-lime" href="/review/new">Create private critique <Sparkles /></Link>
      </div>
    );
  }

  return (
    <form className="community-composer" onSubmit={onPublish}>
      <header>
        <div><p className="eyebrow"><ShieldCheck /> Private by default</p><h3>Post one saved critique.</h3></div>
        <button className="button button-lime" type="submit" disabled={publishing} data-analytics-event="community_post_submit">{publishing ? "Posting..." : <>Post <Send size={16} /></>}</button>
      </header>
      <div className="community-composer-grid">
        <label>
          <span>Saved critique</span>
          <select value={selectedReviewId} onChange={(event) => onReviewChange(event.target.value)}>
            {savedReviews.map((savedReview) => (
              <option key={savedReview.savedDocId} value={savedReview.savedDocId}>
                {savedReview.categoryLabel} - {savedReview.review.overallScore}/10 - {new Date(savedReview.review.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Post title</span>
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} maxLength={120} placeholder={selectedReview ? getDefaultTitle(selectedReview.review.summary) : "What changed after this critique?"} />
        </label>
      </div>
      <label>
        <span>Context note</span>
        <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} maxLength={420} rows={3} placeholder="What should other designers notice or respond to?" />
      </label>
      {selectedReview && <ReviewSharePreview savedReview={selectedReview} />}
      <label className="community-consent">
        <input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} />
        <span><Check /> I understand this publishes the selected critique summary, score, issues, and my note to Community.</span>
      </label>
      {message && <p className="form-success" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
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

function CommunityPostCard({
  expandedComments,
  interaction,
  isLocalOnly,
  localComments,
  onAddLocalComment,
  onOpenComments,
  onShare,
  onToggleInteraction,
  pendingInteraction,
  post,
}: {
  expandedComments: boolean;
  interaction: PostInteraction;
  isLocalOnly: boolean;
  localComments: CommunityComment[];
  onAddLocalComment: (postId: string, comment: CommunityComment) => void;
  onOpenComments: (postId: string) => void;
  onShare: () => void;
  onToggleInteraction: (post: CommunityPost, key: keyof PostInteraction) => void;
  pendingInteraction: Partial<Record<keyof PostInteraction, boolean>>;
  post: CommunityPost;
}) {
  const firstIssue = post.review.issues[0];
  const likedCount = post.stats.likes + (isLocalOnly && interaction.liked ? 1 : 0);
  const savedCount = post.stats.saves + (isLocalOnly && interaction.saved ? 1 : 0);
  const commentCount = post.stats.comments + localComments.length;

  return (
    <article className="community-feed-post" id={post.id}>
      <header>
        <div className="community-avatar">{getInitial(post.authorName)}</div>
        <div>
          <strong>{post.authorName}</strong>
          <span>@{slugify(post.authorName)} · {formatRelativeTime(post.createdAtMs)}</span>
        </div>
      </header>
      <h3>{post.title}</h3>
      {post.note && <p className="community-post-note">{post.note}</p>}
      <div className="community-review-embed">
        <div className="community-review-toolbar">
          <span><MessageSquareText size={15} /> Critique</span>
          <strong>{post.category}</strong>
          <em>{post.review.provider === "live" ? "Live vision" : "Local fallback"}</em>
        </div>
        <div className="community-review-body">
          <div className="community-score-orb"><strong>{post.review.overallScore}</strong><small>/10</small></div>
          <div>
            <p>{post.review.summary}</p>
            {firstIssue && <div className="community-issue-strip"><span>{firstIssue.priority} priority</span>{firstIssue.recommendation}</div>}
          </div>
        </div>
      </div>
      <div className="community-post-actions" aria-label="Post actions">
        <button type="button" aria-pressed={interaction.liked} disabled={pendingInteraction.liked} onClick={() => onToggleInteraction(post, "liked")} data-analytics-event="community_like_click"><Heart size={17} /> {likedCount}</button>
        <button type="button" aria-expanded={expandedComments} aria-controls={`comments-${post.id}`} onClick={() => onOpenComments(post.id)} data-analytics-event="community_comments_open"><MessageSquareText size={17} /> {commentCount}</button>
        <button type="button" aria-pressed={interaction.shared} onClick={onShare} data-analytics-event="community_share_click"><Share2 size={17} /> Share</button>
        <button type="button" aria-pressed={interaction.saved} disabled={pendingInteraction.saved} onClick={() => onToggleInteraction(post, "saved")} data-analytics-event="community_save_click"><Bookmark size={17} /> {savedCount}</button>
      </div>
      {expandedComments && (
        <CommunityComments
          localComments={localComments}
          onAddLocalComment={onAddLocalComment}
          post={post}
        />
      )}
    </article>
  );
}

function CommunityComments({
  localComments,
  onAddLocalComment,
  post,
}: {
  localComments: CommunityComment[];
  onAddLocalComment: (postId: string, comment: CommunityComment) => void;
  post: CommunityPost;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isSample = isSamplePost(post);
  const visibleComments = isSample ? localComments : comments;

  useEffect(() => {
    if (isSample) return;
    const db = getFirebaseClientFirestore();

    return onSnapshot(collection(db, "communityPosts", post.id, "comments"), (snapshot) => {
      const nextComments = snapshot.docs
        .map((commentDoc) => toCommunityComment(commentDoc.id, commentDoc.data()))
        .filter((comment): comment is CommunityComment => comment !== null)
        .sort((left, right) => left.createdAtMs - right.createdAtMs)
        .slice(-4);
      setComments(nextComments);
    });
  }, [isSample, post.id]);

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!user || submitting) return;
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
      if (isSample) {
        onAddLocalComment(post.id, {
          id: `local-${Date.now()}`,
          authorName: parsed.data.authorName,
          body: parsed.data.body,
          createdAtMs: Date.now(),
        });
        setBody("");
        return;
      }

      const db = getFirebaseClientFirestore();
      await addDoc(collection(db, "communityPosts", post.id, "comments"), {
        ...parsed.data,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "communityPosts", post.id), {
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

  return (
    <div id={`comments-${post.id}`} className="community-comments">
      {isSample && <p className="community-comment-empty">Example thread. Your comment stays on this device.</p>}
      {visibleComments.length > 0 ? visibleComments.map((comment) => (
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

function NotificationPanel({ notifications }: { notifications: CommunityNotification[] }) {
  return (
    <div className="community-notification-panel">
      <header><Bell /><div><span className="mono-label">Notifications</span><h3>Recent community signals.</h3></div></header>
      {notifications.length > 0 ? notifications.map((notification) => (
        <article key={notification.id}>
          <strong>{notification.title}</strong>
          <p>{notification.body}</p>
          <time>{formatRelativeTime(notification.createdAtMs)}</time>
        </article>
      )) : <p className="community-comment-empty">Save, share, or publish critiques to build a signal stream.</p>}
    </div>
  );
}

function EmptyCommunityState({ activeView }: { activeView: CommunityView }) {
  const copy = activeView === "saved"
    ? ["No saved posts yet.", "Save useful critique threads from the feed and they will appear here."]
    : activeView === "profile"
      ? ["No public posts yet.", "Publish a saved critique to start your public improvement trail."]
      : ["No public critiques yet.", "Once designers publish saved critiques, the feed will appear here."];

  return (
    <div className="community-feed-state">
      <Sparkles />
      <strong>{copy[0]}</strong>
      <p>{copy[1]}</p>
    </div>
  );
}

function toSavedReview(id: string, data: DocumentData): SavedReview | null {
  const candidate = data.review ?? data;
  const parsed = reviewOutputSchema.safeParse({ ...candidate, id: candidate.id ?? id });
  if (!parsed.success) return null;
  const category = typeof data.category === "string" && data.category in categoryLabels ? data.category as ReviewCategory : "other";
  const categoryLabel = typeof data.categoryLabel === "string" ? data.categoryLabel : categoryLabels[category];

  return {
    savedDocId: id,
    category,
    categoryLabel,
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

async function persistPostInteraction(postId: string, userId: string, key: keyof PostInteraction, nextValue: boolean) {
  const db = getFirebaseClientFirestore();
  const postRef = doc(db, "communityPosts", postId);
  const interactionRef = doc(db, "communityPosts", postId, "interactions", userId);

  await runTransaction(db, async (transaction) => {
    const interactionSnapshot = await transaction.get(interactionRef);
    const currentInteraction = toPostInteraction(interactionSnapshot.data());
    if (currentInteraction[key] === nextValue) return;

    transaction.set(interactionRef, {
      ...currentInteraction,
      [key]: nextValue,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (key === "liked") {
      transaction.update(postRef, { "stats.likes": increment(nextValue ? 1 : -1), updatedAt: serverTimestamp() });
    }

    if (key === "saved") {
      transaction.update(postRef, { "stats.saves": increment(nextValue ? 1 : -1), updatedAt: serverTimestamp() });
    }
  });
}

function toPostInteraction(data: DocumentData | undefined): PostInteraction {
  return {
    liked: typeof data?.liked === "boolean" ? data.liked : false,
    saved: typeof data?.saved === "boolean" ? data.saved : false,
    shared: typeof data?.shared === "boolean" ? data.shared : false,
  };
}

function getNotifications(posts: CommunityPost[], interactions: InteractionMap): CommunityNotification[] {
  const savedNotifications = posts
    .filter((post) => interactions[post.id]?.saved)
    .map((post) => ({
      id: `saved-${post.id}`,
      title: "Saved critique",
      body: `${post.title} is now in your saved community list.`,
      createdAtMs: Date.now(),
    }));

  const feedNotifications = posts.slice(0, 4).map((post) => ({
    id: `post-${post.id}`,
    title: `${post.authorName} shared a critique`,
    body: `${post.category} · ${post.review.overallScore}/10 · ${post.stats.comments} comments`,
    createdAtMs: post.createdAtMs,
  }));

  return [...savedNotifications, ...feedNotifications].slice(0, 8);
}

function toMillis(value: unknown) {
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis() as number;
  }
  if (typeof value === "string") return Date.parse(value);
  return null;
}

function isSamplePost(post: CommunityPost) {
  return post.authorId === "sample";
}

function setPendingInteraction(
  pendingInteractions: PendingInteractionMap,
  postId: string,
  key: keyof PostInteraction,
  isPending: boolean,
): PendingInteractionMap {
  const nextPostState = { ...(pendingInteractions[postId] ?? {}), [key]: isPending };
  if (!isPending) delete nextPostState[key];

  const nextState = { ...pendingInteractions };
  if (Object.keys(nextPostState).length === 0) {
    delete nextState[postId];
  } else {
    nextState[postId] = nextPostState;
  }

  return nextState;
}

function getLocalInteractionMessage(key: keyof PostInteraction) {
  if (key === "liked") return "Reaction saved for this sample post.";
  if (key === "saved") return "Saved to this browser.";
  return "Community action saved locally.";
}

function getPersistedInteractionMessage(key: keyof PostInteraction, enabled: boolean) {
  if (key === "liked") return enabled ? "Reaction added." : "Reaction removed.";
  if (key === "saved") return enabled ? "Saved to your community list." : "Removed from saved community posts.";
  return "Community action updated.";
}

function readStoredInteractions(): InteractionMap {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(interactionStorageKey);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};

    return Object.entries(parsed).reduce<InteractionMap>((storedInteractions, [postId, value]) => {
      storedInteractions[postId] = toPostInteraction(
        typeof value === "object" && value !== null ? value as DocumentData : undefined,
      );
      return storedInteractions;
    }, {});
  } catch {
    return {};
  }
}

function writeStoredInteractions(interactions: InteractionMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(interactionStorageKey, JSON.stringify(interactions));
  } catch {
    // Nonessential interaction persistence can fail silently in private browsing.
  }
}

function readStoredSampleComments(): CommentMap {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(sampleCommentStorageKey);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};

    return Object.entries(parsed).reduce<CommentMap>((storedComments, [postId, value]) => {
      if (!Array.isArray(value)) {
        storedComments[postId] = [];
        return storedComments;
      }

      storedComments[postId] = value
        .map((comment, index) => toStoredCommunityComment(comment, `${postId}-${index}`))
        .filter((comment): comment is CommunityComment => comment !== null)
        .slice(-12);
      return storedComments;
    }, {});
  } catch {
    return {};
  }
}

function toInteractionMap(entries: ReadonlyArray<readonly [string, PostInteraction]>): InteractionMap {
  return entries.reduce<InteractionMap>((nextInteractions, [postId, interaction]) => {
    nextInteractions[postId] = interaction;
    return nextInteractions;
  }, {});
}

function writeStoredSampleComments(comments: CommentMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(sampleCommentStorageKey, JSON.stringify(comments));
  } catch {
    // Sample comments are nonessential and should not block the community UI.
  }
}

function toStoredCommunityComment(value: unknown, fallbackId: string): CommunityComment | null {
  if (typeof value !== "object" || value === null) return null;
  const body = "body" in value && typeof value.body === "string" ? value.body.trim() : "";
  if (body.length < 2) return null;

  return {
    id: "id" in value && typeof value.id === "string" ? value.id : fallbackId,
    authorName: "authorName" in value && typeof value.authorName === "string" ? value.authorName : "Designer",
    body,
    createdAtMs: "createdAtMs" in value && typeof value.createdAtMs === "number" ? value.createdAtMs : Date.now(),
  };
}

function getDefaultTitle(summary: string) {
  return summary.split(".")[0].slice(0, 120);
}

function formatRelativeTime(value: number) {
  const differenceMs = Date.now() - value;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (differenceMs < hour) return `${Math.max(1, Math.round(differenceMs / minute))}m`;
  if (differenceMs < day) return `${Math.round(differenceMs / hour)}h`;
  return `${Math.round(differenceMs / day)}d`;
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "I";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "designer";
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
