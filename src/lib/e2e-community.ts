"use client";

export type E2ELocalCommunityComment = {
  id: string;
  authorName: string;
  body: string;
  createdAtMs: number;
};

const COMMENT_STORAGE_KEY = "iroguide:e2e-community-comments:v1";
const FAIL_NEXT_INTERACTION_KEY = "iroguide:e2e-community-fail-next-interaction";
const E2E_DELAY_MS = 250;

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
