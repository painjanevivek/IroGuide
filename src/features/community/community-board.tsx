"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { communityCommentSchema, type CommunityMutation } from "@/domain/community";
import { communityProjectionViewSchema, communityPublicCommentSchema, type CommunityPublicProjection } from "@/domain/community-safety";
import { useAuth } from "@/features/auth/auth-provider";
import { requestJsonWithFallback } from "@/lib/api-client";
import { isE2ELocalAuthEnabled } from "@/lib/e2e-local-auth";
import {
  persistE2ELocalCommunityComment,
  persistE2ELocalCommunityInteraction,
  readE2ELocalCommunityComments,
} from "@/lib/e2e-community";
import { getFirebaseClientFirestore } from "@/lib/firebase/firestore";
import {
  getPublishableCommunityReviews,
  toCommunitySavedReview,
  type CommunitySavedReview as SavedReview,
} from "@/lib/community-reviews";
import { createOptimisticMutationScope, runOptimisticMutation } from "@/lib/optimistic-mutation";

type CommunityPost = CommunityPublicProjection & {
  id: string;
  createdAtMs: number;
  viewerOwned: boolean;
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
type InteractionRetry = {
  key: keyof PostInteraction;
  post: CommunityPost;
};

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
  makeSamplePost("sample-identity", "Anika Rao", "A quieter identity for a noisy category", "Brand identity", "The brand identity has a stronger foundation after simplifying the first read.", 24, { comments: 2, likes: 18, saves: 7 }),
  makeSamplePost("sample-editorial", "Milo Chen", "Independent culture, set in motion", "Editorial", "The editorial poster has strong motion, but the supporting details need calmer hierarchy.", 48, { comments: 1, likes: 12, saves: 4 }),
  makeSamplePost("sample-product", "Nora Studio", "Rethinking the first-run workspace", "Product UI", "The product UI feels more approachable when advanced controls arrive later.", 72, { comments: 3, likes: 24, saves: 11 }),
];

export function CommunityBoard() {
  const { user } = useAuth();
  const interactionsRef = useRef<InteractionMap>({});
  const interactionMutationScopeRef = useRef(createOptimisticMutationScope());
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
  const [interactionRetry, setInteractionRetry] = useState<InteractionRetry | null>(null);

  useEffect(() => {
    interactionsRef.current = interactions;
  }, [interactions]);

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
    if (!user || isE2ELocalAuthEnabled()) {
      queueMicrotask(() => setLoadingPosts(false));
      return;
    }
    let active = true;
    void loadCommunityFeed(user).then(({ nextInteractions, nextPosts }) => {
      if (!active) return;
      setPosts(nextPosts);
      setInteractions((current) => ({ ...current, ...nextInteractions }));
    }).catch(() => {
      if (active) setPosts([]);
    }).finally(() => {
      if (active) setLoadingPosts(false);
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (isE2ELocalAuthEnabled()) {
      queueMicrotask(() => {
        setSavedReviews([]);
        setLoadingSaved(false);
      });
      return;
    }

    const db = getFirebaseClientFirestore();
    const reviewsQuery = query(collection(db, "reviews"), where("userId", "==", user.uid), limit(30));

    return onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const nextReviews = snapshot.docs
          .map((reviewDoc) => toCommunitySavedReview(reviewDoc.id, reviewDoc.data()))
          .filter((review): review is SavedReview => review !== null)
          .sort((left, right) => Date.parse(right.review.createdAt) - Date.parse(left.review.createdAt));
        const nextPublishableReviews = getPublishableCommunityReviews(nextReviews);
        setSavedReviews(nextReviews);
        setSelectedReviewId((current) => nextPublishableReviews.some((review) => review.savedDocId === current)
          ? current
          : nextPublishableReviews[0]?.savedDocId ?? "");
        setLoadingSaved(false);
      },
      () => {
        setSavedReviews([]);
        setLoadingSaved(false);
      },
    );
  }, [user]);

  const publishableReviews = useMemo(
    () => getPublishableCommunityReviews(savedReviews),
    [savedReviews],
  );
  const selectedReview = useMemo(
    () => publishableReviews.find((review) => review.savedDocId === selectedReviewId) ?? null,
    [publishableReviews, selectedReviewId],
  );
  const visiblePosts = posts.length > 0 ? posts : fallbackPosts;
  const myPosts = user ? visiblePosts.filter((post) => post.viewerOwned) : [];
  const savedPosts = visiblePosts.filter((post) => interactions[post.id]?.saved);
  const notifications = useMemo(() => getNotifications(visiblePosts, interactions), [interactions, visiblePosts]);
  const currentFeed = activeView === "profile" ? myPosts : activeView === "saved" ? savedPosts : visiblePosts;

  async function publishPost(event: FormEvent) {
    event.preventDefault();
    if (!user || !selectedReview || publishing) return;
    setError("");
    setMessage("");

    if (!consent) {
      setError("Confirm that this selected critique can be visible in Community.");
      return;
    }

    setPublishing(true);
    try {
      await mutateCommunity(user, {
        action: "publish",
        reviewId: selectedReview.savedDocId,
        consent: true,
        consentVersion: "community-consent-v1",
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
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
    if (pendingInteractions[post.id]?.[key]) return;
    const existing = interactionsRef.current[post.id] ?? emptyInteraction;
    const nextValue = !existing[key];

    const applyInteraction = (current: InteractionMap) => {
      const currentPostInteraction = current[post.id] ?? emptyInteraction;
      return { ...current, [post.id]: { ...currentPostInteraction, [key]: nextValue } };
    };

    if (isSamplePost(post)) {
      commitInteractions(applyInteraction(interactionsRef.current));
      setShareMessage(getLocalInteractionMessage(key));
      setInteractionRetry(null);
      return;
    }

    if (!user) {
      commitInteractions(applyInteraction(interactionsRef.current));
      setShareMessage("Sign in to keep community reactions across devices.");
      setInteractionRetry(null);
      return;
    }

    const mutationToken = interactionMutationScopeRef.current.start(`${post.id}:${key}`);
    setPendingInteractions((current) => setPendingInteraction(current, post.id, key, true));
    setInteractionRetry(null);
    setShareMessage(nextValue ? "Updating community action..." : "Removing community action...");

    const mutationResult = await runOptimisticMutation<InteractionMap, void>({
      apply: applyInteraction,
      commit: commitInteractions,
      getState: () => interactionsRef.current,
      isCurrent: () => interactionMutationScopeRef.current.isCurrent(mutationToken),
      run: () => persistPostInteraction(post.id, user, key, nextValue),
    });

    if (mutationResult.status === "success") {
      setShareMessage(getPersistedInteractionMessage(key, nextValue));
      setInteractionRetry(null);
    } else {
      setShareMessage(mutationResult.error instanceof Error ? mutationResult.error.message : "Could not update this community action.");
      setInteractionRetry({ post, key });
    }

    interactionMutationScopeRef.current.finish(mutationToken);
    setPendingInteractions((current) => setPendingInteraction(current, post.id, key, false));
  }

  function commitInteractions(nextInteractions: InteractionMap) {
    interactionsRef.current = nextInteractions;
    setInteractions(nextInteractions);
  }

  async function sharePost(post: CommunityPost) {
    const href = `${window.location.origin}${window.location.pathname}#${post.id}`;
    const shareData = {
      title: post.title,
      text: `${post.publicAuthor.displayName} shared an IroGuide critique: ${post.title}`,
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
        await persistPostInteraction(post.id, user, "shared", true);
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
              savedReviews={publishableReviews}
              selectedReview={selectedReview}
              selectedReviewId={selectedReviewId}
              title={title}
              unverifiedReviewCount={savedReviews.length - publishableReviews.length}
              userSignedIn={Boolean(user)}
            />
          )}

          {shareMessage && (
            <div className="community-share-state" role={interactionRetry ? "alert" : "status"}>
              <p>{shareMessage}</p>
              {interactionRetry && <button type="button" onClick={() => void toggleInteraction(interactionRetry.post, interactionRetry.key)}>Retry</button>}
            </div>
          )}

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
  unverifiedReviewCount,
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
  unverifiedReviewCount: number;
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
        <strong>{unverifiedReviewCount > 0 ? "No verified critiques ready to publish." : "No saved critiques yet."}</strong>
        <p>{unverifiedReviewCount > 0
          ? `${unverifiedReviewCount} private critique${unverifiedReviewCount === 1 ? " is" : "s are"} still available in your history, but cannot claim trusted provenance. Rerun a design to create a verified copy.`
          : "Run a private critique, save it, then choose whether it belongs in Community."}</p>
        <Link className="button button-lime" href="/review/new">{unverifiedReviewCount > 0 ? "Create verified critique" : "Create private critique"} <Sparkles /></Link>
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
  onToggleInteraction: (post: CommunityPost, key: keyof PostInteraction) => void | Promise<void>;
  pendingInteraction: Partial<Record<keyof PostInteraction, boolean>>;
  post: CommunityPost;
}) {
  const likedCount = post.stats.likes + (isLocalOnly && interaction.liked ? 1 : 0);
  const savedCount = post.stats.saves + (isLocalOnly && interaction.saved ? 1 : 0);
  const commentCount = post.stats.comments + localComments.length;

  return (
    <article className="community-feed-post" id={post.id}>
      <header>
        <div className="community-avatar">{getInitial(post.publicAuthor.displayName)}</div>
        <div>
          <strong>{post.publicAuthor.displayName}</strong>
          <span>@{slugify(post.publicAuthor.displayName)} · {formatRelativeTime(post.createdAtMs)}</span>
        </div>
      </header>
      <h3>{post.title}</h3>
      {post.note && <p className="community-post-note">{post.note}</p>}
      <div className="community-review-embed">
        <div className="community-review-toolbar">
          <span><MessageSquareText size={15} /> Critique</span>
          <strong>{post.category}</strong>
          <em>Public excerpt</em>
        </div>
        <div className="community-review-body">
          <div>
            <p>{post.critiqueExcerpt}</p>
          </div>
        </div>
      </div>
      <div className="community-post-actions" aria-label="Post actions">
        <button type="button" className="like-action" aria-pressed={interaction.liked} disabled={pendingInteraction.liked} onClick={() => onToggleInteraction(post, "liked")} data-analytics-event="community_like_click"><Heart size={17} /> {likedCount}</button>
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
  const optimisticCommentsRef = useRef<CommunityComment[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [optimisticComments, setOptimisticComments] = useState<CommunityComment[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [retryCommentBody, setRetryCommentBody] = useState("");
  const isSample = isSamplePost(post);
  const visibleComments = isSample ? localComments : mergeComments(comments, optimisticComments);

  useEffect(() => {
    optimisticCommentsRef.current = optimisticComments;
  }, [optimisticComments]);

  useEffect(() => {
    if (isSample) return;
    if (isE2ELocalAuthEnabled()) {
      queueMicrotask(() => setComments(readE2ELocalCommunityComments(post.id)));
      return;
    }
    if (!user) return;
    let active = true;
    void loadCommunityComments(user, post.id).then((nextComments) => {
      if (!active) return;
      setComments(nextComments);
      commitOptimisticComments(optimisticCommentsRef.current.filter((comment) => !nextComments.some((nextComment) => nextComment.id === comment.id)));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [isSample, post.id, user]);

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

    const commentBody = parsed.data.body;
    const optimisticComment = {
      id: `optimistic-${post.id}-${Date.now()}`,
      authorName: parsed.data.authorName,
      body: commentBody,
      createdAtMs: Date.now(),
    };

    setSubmitting(true);
    setBody("");
    setRetryCommentBody("");
    try {
      if (isSample) {
        onAddLocalComment(post.id, optimisticComment);
        return;
      }

      if (isE2ELocalAuthEnabled()) {
        const result = await runOptimisticMutation<CommunityComment[], { id: string }>({
          apply: (current) => [...current, optimisticComment],
          commit: commitOptimisticComments,
          getState: () => optimisticCommentsRef.current,
          reconcile: ({ id }, current) => current.map((comment) => comment.id === optimisticComment.id ? { ...comment, id } : comment),
          run: () => persistE2ELocalCommunityComment({
            authorName: parsed.data.authorName,
            body: commentBody,
            postId: post.id,
          }),
        });

        if (result.status === "error") {
          throw result.error;
        }
        return;
      }

      const result = await runOptimisticMutation<CommunityComment[], { id: string }>({
        apply: (current) => [...current, optimisticComment],
        commit: commitOptimisticComments,
        getState: () => optimisticCommentsRef.current,
        reconcile: ({ id }, current) => current.map((comment) => comment.id === optimisticComment.id ? { ...comment, id } : comment),
        run: () => mutateCommunity(user, { action: "comment", postId: post.id, body: commentBody }) as Promise<{ id: string }>,
      });

      if (result.status === "error") {
        throw result.error;
      }
    } catch (commentError) {
      setBody(commentBody);
      setRetryCommentBody(commentBody);
      setError(commentError instanceof Error ? commentError.message : "Could not post this comment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id={`comments-${post.id}`} className="community-comments">
      {isSample && <p className="community-comment-empty">Example thread. Your comment stays on this device.</p>}
      {visibleComments.length > 0 ? visibleComments.map((comment) => (
        <p key={comment.id} className={`community-comment${comment.id.startsWith("optimistic-") ? " is-pending" : ""}`}>
          <strong>{comment.authorName}{comment.id.startsWith("optimistic-") ? <em>Sending</em> : null}</strong>{comment.body}
        </p>
      )) : <p className="community-comment-empty">Start the critique thread.</p>}
      {user ? (
        <form onSubmit={submitComment} className="community-comment-form">
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} maxLength={500} placeholder="Add a specific, useful comment..." />
          <button type="submit" disabled={submitting} aria-label="Post comment"><Send size={15} /></button>
        </form>
      ) : (
        <Link className="community-comment-login" href="/auth?mode=sign-up">Sign in to comment</Link>
      )}
      {error && (
        <div className="community-comment-error" role="alert">
          <p>{error}</p>
          {retryCommentBody && <button type="button" onClick={() => { setBody(retryCommentBody); setError(""); }}>Retry</button>}
        </div>
      )}
    </div>
  );

  function commitOptimisticComments(nextComments: CommunityComment[]) {
    optimisticCommentsRef.current = nextComments;
    setOptimisticComments(nextComments);
  }
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
      <Sparkles className="sparkle-blink-glow" />
      <strong>{copy[0]}</strong>
      <p>{copy[1]}</p>
    </div>
  );
}

async function loadCommunityFeed(user: { getIdToken: () => Promise<string> }) {
  const payload = await requestJsonWithFallback({
    path: "/api/community",
    init: { method: "GET", headers: { Authorization: `Bearer ${await user.getIdToken()}` } },
    unavailableMessage: "Community is not available right now.",
    failureMessage: "Could not load Community.",
  }) as { projections?: unknown };
  const views = Array.isArray(payload.projections)
    ? payload.projections.flatMap((value) => {
      const parsed = communityProjectionViewSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    })
    : [];
  return {
    nextInteractions: views.reduce<InteractionMap>((result, view) => {
      result[view.projection.postId] = { liked: view.viewer.liked, saved: view.viewer.saved, shared: view.viewer.shared };
      return result;
    }, {}),
    nextPosts: views.map(({ projection, viewer }) => ({
      ...projection,
      id: projection.postId,
      createdAtMs: Date.parse(projection.publishedAt),
      viewerOwned: viewer.owned,
    })),
  };
}

async function loadCommunityComments(user: { getIdToken: () => Promise<string> }, postId: string) {
  const payload = await requestJsonWithFallback({
    path: `/api/community?postId=${encodeURIComponent(postId)}`,
    init: { method: "GET", headers: { Authorization: `Bearer ${await user.getIdToken()}` } },
    unavailableMessage: "Community comments are not available right now.",
    failureMessage: "Could not load Community comments.",
  }) as { comments?: unknown };
  return Array.isArray(payload.comments)
    ? payload.comments.flatMap((value) => {
      const parsed = communityPublicCommentSchema.safeParse(value);
      return parsed.success ? [{
        id: parsed.data.id,
        authorName: parsed.data.authorName,
        body: parsed.data.body,
        createdAtMs: Date.parse(parsed.data.createdAt),
      }] : [];
    }).slice(-4)
    : [];
}

async function persistPostInteraction(postId: string, user: { getIdToken: () => Promise<string> }, key: keyof PostInteraction, nextValue: boolean) {
  if (isE2ELocalAuthEnabled()) {
    await persistE2ELocalCommunityInteraction(postId, key);
    return;
  }

  await mutateCommunity(user, { action: "interaction", postId, key, value: nextValue });
}

async function mutateCommunity(user: { getIdToken: () => Promise<string> }, mutation: CommunityMutation) {
  return requestJsonWithFallback({
    path: "/api/community",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mutation),
    },
    unavailableMessage: "Community is not available right now.",
    failureMessage: "Could not update Community.",
  });
}

function toPostInteraction(data: Record<string, unknown> | undefined): PostInteraction {
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
    title: `${post.publicAuthor.displayName} shared a critique`,
    body: `${post.category} · ${post.stats.comments} comments`,
    createdAtMs: post.createdAtMs,
  }));

  return [...savedNotifications, ...feedNotifications].slice(0, 8);
}

function isSamplePost(post: CommunityPost) {
  return post.postId.startsWith("sample-");
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
        typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined,
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

function mergeComments(serverComments: CommunityComment[], pendingComments: CommunityComment[]) {
  const serverIds = new Set(serverComments.map((comment) => comment.id));
  return [...serverComments, ...pendingComments.filter((comment) => !serverIds.has(comment.id))]
    .sort((left, right) => left.createdAtMs - right.createdAtMs)
    .slice(-6);
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

function makeSamplePost(
  id: string,
  displayName: string,
  title: string,
  category: string,
  critiqueExcerpt: string,
  ageHours: number,
  stats: CommunityPublicProjection["stats"],
): CommunityPost {
  const publishedAt = new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString();
  return {
    schemaVersion: 1,
    postId: id,
    id,
    publicAuthor: { displayName },
    title,
    note: "A privacy-safe sample showing the kind of focused discussion Community may support.",
    category,
    critiqueExcerpt,
    stats,
    publishedAt,
    consent: { version: "community-consent-v1", grantedAt: publishedAt, withdrawalState: "active" },
    createdAtMs: Date.parse(publishedAt),
    viewerOwned: false,
  };
}
