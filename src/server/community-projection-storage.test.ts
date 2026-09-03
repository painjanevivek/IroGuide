import { describe, expect, it, vi } from "vitest";
import { listCommunityProjections } from "./community-projection-storage";

const firestoreMock = vi.hoisted(() => {
  const document = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });
  const projection = (id: string, ownerId: string, extra: Record<string, unknown> = {}) => document(id, {
    schemaVersion: 1,
    postId: id,
    ownerId,
    sourceReviewId: `review-${id}`,
    publicAuthor: { displayName: `Designer ${id}` },
    title: "A clearer first read",
    category: "Logo",
    critiqueExcerpt: "The mark reads more clearly after simplifying the silhouette.",
    visibility: "public",
    moderationState: "clear",
    moderationActionId: null,
    stats: { comments: 0, likes: 0, saves: 0 },
    publishedAt: "2026-08-24T08:00:00.000Z",
    consent: { version: "community-consent-v1", grantedAt: "2026-08-24T08:00:00.000Z", withdrawalState: "active" },
    updatedAt: "2026-08-24T08:00:00.000Z",
    ...extra,
  });
  const projections = [
    projection("post-allowed", "allowed-author"),
    projection("post-outbound", "blocked-by-viewer"),
    projection("post-inbound", "blocked-viewer"),
    projection("post-private-leak", "allowed-author", { review: { summary: "private" } }),
  ];
  const collection = vi.fn((name: string) => {
    const state: { field?: string } = {};
    return {
      get: async () => {
        if (name === "communityProjections") return { docs: projections };
        if (name === "communityBlocks" && state.field === "blockerId") return { docs: [document("a", { blockedId: "blocked-by-viewer" })] };
        if (name === "communityBlocks" && state.field === "blockedId") return { docs: [document("b", { blockerId: "blocked-viewer" })] };
        return { docs: [] };
      },
      limit() { return this; },
      where(field: string) { state.field = field; return this; },
    };
  });
  return { collection };
});

vi.mock("@/server/firebase-admin", () => ({ getFirebaseAdminFirestore: () => ({ collection: firestoreMock.collection }) }));

describe("Community public projection reads", () => {
  it("filters blocks in both directions and strips storage-only fields", async () => {
    const result = await listCommunityProjections("viewer");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      projection: expect.objectContaining({ postId: "post-allowed", publicAuthor: { displayName: "Designer post-allowed" } }),
      viewer: { liked: false, owned: false, saved: false, shared: false },
    }));
    expect(result[0]?.projection).not.toHaveProperty("ownerId");
    expect(result[0]?.projection).not.toHaveProperty("sourceReviewId");
    expect(result[0]?.projection).not.toHaveProperty("review");
  });
});
