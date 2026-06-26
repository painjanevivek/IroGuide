"use client";

import type { CommunityPostInput } from "@/domain/community";

export type E2ELocalCommunityPost = CommunityPostInput & {
  id: string;
  createdAtMs: number;
};

export type E2ELocalCommunityComment = {
  id: string;
  authorName: string;
  body: string;
  createdAtMs: number;
};

const COMMENT_STORAGE_KEY = "iroguide:e2e-community-comments:v1";
const FAIL_NEXT_INTERACTION_KEY = "iroguide:e2e-community-fail-next-interaction";
const E2E_POST_ID = "e2e-community-optimistic";
const E2E_DELAY_MS = 250;

export function getE2ELocalCommunityPosts(now = Date.now()): E2ELocalCommunityPost[] {
  return [{
    id: E2E_POST_ID,
    authorId: "community-e2e-author",
    authorName: "June Interaction Lab",
    reviewId: "e2e-optimistic-review",
    title: "Optimistic critique thread",
    note: "A deterministic public post for the optimistic community interaction smoke.",
    category: "Product UI",
    visibility: "public",
    stats: { comments: 0, likes: 4, saves: 1 },
    createdAtMs: now - 1000 * 60 * 10,
    review: {
      id: "e2e-optimistic-review",
      createdAt: new Date(now - 1000 * 60 * 15).toISOString(),
      overallScore: 8.1,
      summary: "The critique thread is focused enough to test optimistic community updates.",
      strengths: ["The interaction has one clear feedback target."],
      scores: [{ label: "Clarity", score: 8.1 }],
      rubricVersion: "e2e-community-v1",
      issues: [{
        id: "e2e-optimistic-issue",
        category: "Interaction",
        score: 8,
        priority: "medium",
        observation: "The feedback loop should feel immediate while network state resolves.",
        impact: "Designers need confidence that community actions are recorded or recoverable.",
        recommendation: "Show instant UI feedback, then reconcile to the persisted state.",
        actions: ["Apply optimistic state immediately.", "Restore clear retry affordances after failure."],
      }],
      annotations: [],
      checklist: [{ label: "Confirm rollback and retry behavior.", priority: "medium" }],
      followUps: ["Did the optimistic state reconcile after reload?"],
      provider: "demo",
    },
  }];
}

export async function persistE2ELocalCommunityInteraction(postId: string, key: string) {
  await delay(E2E_DELAY_MS);
  const failureTarget = window.localStorage.getItem(FAIL_NEXT_INTERACTION_KEY);
  if (failureTarget === "*" || failureTarget === key || failureTarget === `${postId}:${key}`) {
    window.localStorage.removeItem(FAIL_NEXT_INTERACTION_KEY);
    throw new Error("E2E community interaction failed.");
  }
}

export function readE2ELocalCommunityComments(postId: string): E2ELocalCommunityComment[] {
  try {
    const commentsByPost = readCommentMap();
    return (commentsByPost[postId] ?? []).slice(-6);
  } catch {
    return [];
  }
}

export async function persistE2ELocalCommunityComment({
  authorName,
  body,
  postId,
}: {
  authorName: string;
  body: string;
  postId: string;
}) {
  await delay(E2E_DELAY_MS);
  const comment = {
    id: `e2e-comment-${Date.now()}`,
    authorName,
    body,
    createdAtMs: Date.now(),
  };
  const commentsByPost = readCommentMap();
  commentsByPost[postId] = [...(commentsByPost[postId] ?? []), comment].slice(-12);
  window.localStorage.setItem(COMMENT_STORAGE_KEY, JSON.stringify(commentsByPost));
  return { id: comment.id };
}

function readCommentMap() {
  const rawValue = window.localStorage.getItem(COMMENT_STORAGE_KEY);
  if (!rawValue) return {};
  const parsed = JSON.parse(rawValue) as Record<string, unknown>;
  if (typeof parsed !== "object" || parsed === null) return {};

  return Object.entries(parsed).reduce<Record<string, E2ELocalCommunityComment[]>>((commentsByPost, [postId, value]) => {
    commentsByPost[postId] = Array.isArray(value)
      ? value.map(toE2ELocalCommunityComment).filter((comment): comment is E2ELocalCommunityComment => comment !== null)
      : [];
    return commentsByPost;
  }, {});
}

function toE2ELocalCommunityComment(value: unknown): E2ELocalCommunityComment | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("id" in value) || typeof value.id !== "string") return null;
  if (!("authorName" in value) || typeof value.authorName !== "string") return null;
  if (!("body" in value) || typeof value.body !== "string" || value.body.trim().length < 2) return null;
  return {
    id: value.id,
    authorName: value.authorName,
    body: value.body.trim(),
    createdAtMs: "createdAtMs" in value && typeof value.createdAtMs === "number" ? value.createdAtMs : Date.now(),
  };
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
