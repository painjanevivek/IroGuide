import type { Firestore } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestoreMocks);

import { COMMUNITY_COMMENT_PAGE_SIZE, getRecentCommunityCommentsQuery } from "./community-comments-query";

describe("getRecentCommunityCommentsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests only the four newest comments for a community post", () => {
    const db = {} as Firestore;
    const commentsCollection = { kind: "comments-collection" };
    const newestFirst = { kind: "newest-first" };
    const boundedPage = { kind: "bounded-page" };
    const commentsQuery = { kind: "comments-query" };

    firestoreMocks.collection.mockReturnValue(commentsCollection);
    firestoreMocks.orderBy.mockReturnValue(newestFirst);
    firestoreMocks.limit.mockReturnValue(boundedPage);
    firestoreMocks.query.mockReturnValue(commentsQuery);

    expect(getRecentCommunityCommentsQuery(db, "post-123")).toBe(commentsQuery);
    expect(firestoreMocks.collection).toHaveBeenCalledWith(db, "communityPosts", "post-123", "comments");
    expect(firestoreMocks.orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(firestoreMocks.limit).toHaveBeenCalledWith(COMMUNITY_COMMENT_PAGE_SIZE);
    expect(firestoreMocks.query).toHaveBeenCalledWith(commentsCollection, newestFirst, boundedPage);
    expect(COMMUNITY_COMMENT_PAGE_SIZE).toBe(4);
  });
});
