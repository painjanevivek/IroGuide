import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { communityStoredProjectionSchema } from "@/domain/community-safety";
import {
  CommunityDeletionIncompleteError,
  deleteCommunityDataForUser,
  reportCommunityTarget,
} from "./community-user-safety-storage";
import { applyCommunityModerationCommand } from "./community-moderation-storage";
import { setCommunityInteraction } from "./community-projection-storage";

type StoredValue = Record<string, unknown>;
type Reference = {
  collectionName: string;
  delete: () => Promise<void>;
  id: string;
  path: string;
  update: (value: StoredValue) => Promise<void>;
};

const firestoreMock = vi.hoisted(() => {
  const collections = new Map<string, Map<string, StoredValue>>();
  const failDeletes = new Set<string>();
  const mapFor = (name: string) => {
    const existing = collections.get(name);
    if (existing) return existing;
    const created = new Map<string, StoredValue>();
    collections.set(name, created);
    return created;
  };
  const reference = (collectionName: string, id: string): Reference => ({
    collectionName,
    id,
    path: `${collectionName}/${id}`,
    delete: async () => { mapFor(collectionName).delete(id); },
    update: async (value) => {
      const current = mapFor(collectionName).get(id) ?? {};
      mapFor(collectionName).set(id, { ...current, ...value });
    },
  });
  const snapshot = (ref: Reference) => ({
    data: () => mapFor(ref.collectionName).get(ref.id),
    exists: mapFor(ref.collectionName).has(ref.id),
    id: ref.id,
    ref,
  });
  const collection = vi.fn((name: string) => {
    const createQuery = (filters: Array<[string, unknown]> = []) => {
      const query = {
        get: async () => {
          const docs = [...mapFor(name).entries()]
            .filter(([, value]) => filters.every(([field, expected]) => value[field] === expected))
            .map(([id]) => snapshot(reference(name, id)));
          return { docs, empty: docs.length === 0, size: docs.length };
        },
        limit: () => query,
        where: (field: string, _operator: string, expected: unknown) => createQuery([...filters, [field, expected]]),
      };
      return query;
    };
    return {
      ...createQuery(),
      doc: (id: string) => reference(name, id),
    };
  });
  const batch = vi.fn(() => {
    const deletes: Reference[] = [];
    const sets: Array<{ ref: Reference; value: StoredValue }> = [];
    const updates: Array<{ ref: Reference; value: StoredValue }> = [];
    return {
      delete: (ref: Reference) => deletes.push(ref),
      set: (ref: Reference, value: StoredValue) => sets.push({ ref, value }),
      update: (ref: Reference, value: StoredValue) => updates.push({ ref, value }),
      commit: async () => {
        const failed = deletes.find((ref) => failDeletes.has(ref.collectionName));
        if (failed) throw new Error(`delete failed for ${failed.collectionName}`);
        for (const item of updates) await item.ref.update(item.value);
        for (const ref of deletes) await ref.delete();
        for (const item of sets) mapFor(item.ref.collectionName).set(item.ref.id, item.value);
      },
    };
  });
  const runTransaction = vi.fn(async (work: (transaction: {
    create: (ref: Reference, value: StoredValue) => void;
    delete: (ref: Reference) => void;
    get: (ref: Reference) => Promise<ReturnType<typeof snapshot>>;
    set: (ref: Reference, value: StoredValue) => void;
    update: (ref: Reference, value: StoredValue) => void;
  }) => Promise<unknown>) => work({
    create: (ref, value) => mapFor(ref.collectionName).set(ref.id, value),
    delete: (ref) => mapFor(ref.collectionName).delete(ref.id),
    get: async (ref) => snapshot(ref),
    set: (ref, value) => mapFor(ref.collectionName).set(ref.id, value),
    update: (ref, value) => {
      const current = mapFor(ref.collectionName).get(ref.id) ?? {};
      mapFor(ref.collectionName).set(ref.id, { ...current, ...value });
    },
  }));
  return { batch, collection, collections, failDeletes, mapFor, runTransaction };
});

const authMock = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminAuth: () => authMock,
  getFirebaseAdminFirestore: () => ({
    batch: firestoreMock.batch,
    collection: firestoreMock.collection,
    runTransaction: firestoreMock.runTransaction,
  }),
}));

const projection = communityStoredProjectionSchema.parse({
  schemaVersion: 1,
  postId: "post-a",
  publicAuthor: { displayName: "Designer" },
  title: "A clearer first read",
  category: "Logo",
  critiqueExcerpt: "Simplify the silhouette to improve recognition.",
  stats: { comments: 1, likes: 0, saves: 0 },
  publishedAt: "2026-08-28T08:00:00.000Z",
  consent: { version: "community-consent-v1", grantedAt: "2026-08-28T08:00:00.000Z", withdrawalState: "active" },
  ownerId: "owner-a",
  sourceReviewId: "review-a",
  visibility: "public",
  moderationState: "clear",
  moderationActionId: null,
  updatedAt: "2026-08-28T08:00:00.000Z",
});

describe("Community user-safety persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.collections.clear();
    firestoreMock.failDeletes.clear();
    authMock.getUser.mockReset();
    authMock.getUser.mockResolvedValue({ uid: "target-a" });
    process.env.IROGUIDE_COMMUNITY_AUDIT_HMAC_KEY = "a-secure-test-audit-key-that-is-long-enough";
  });

  afterEach(() => {
    delete process.env.IROGUIDE_COMMUNITY_AUDIT_HMAC_KEY;
    delete process.env.IROGUIDE_COMMUNITY_MODERATOR_UIDS;
    delete process.env.IROGUIDE_COMMUNITY_SENIOR_MODERATOR_UIDS;
  });

  it("retains hidden ownership roots and comments when derivative deletion needs a retry", async () => {
    firestoreMock.mapFor("communityProjections").set("post-a", projection);
    firestoreMock.mapFor("communityComments").set("comment-a", {
      schemaVersion: 1,
      id: "comment-a",
      postId: "post-a",
      authorId: "other-user",
      authorName: "Peer",
      authorDeletedAt: null,
      body: "Useful direction.",
      status: "visible",
      moderationState: "clear",
      moderationActionId: null,
      cursorKey: "2026-08-28T08:01:00.000Z_comment-a",
      createdAt: "2026-08-28T08:01:00.000Z",
      updatedAt: "2026-08-28T08:01:00.000Z",
    });
    firestoreMock.mapFor("communityInteractions").set("interaction-a", {
      userId: "other-user",
      postId: "post-a",
    });
    firestoreMock.failDeletes.add("communityInteractions");

    await expect(deleteCommunityDataForUser("owner-a")).rejects.toBeInstanceOf(CommunityDeletionIncompleteError);
    expect(firestoreMock.mapFor("communityProjections").get("post-a")).toEqual(expect.objectContaining({ visibility: "hidden" }));
    expect(firestoreMock.mapFor("communityComments").has("comment-a")).toBe(true);

    firestoreMock.failDeletes.clear();
    await expect(deleteCommunityDataForUser("owner-a")).resolves.toEqual(expect.objectContaining({ commentsDeleted: 1, postsDeleted: 1 }));
    expect(firestoreMock.mapFor("communityProjections").has("post-a")).toBe(false);
    expect(firestoreMock.mapFor("communityComments").has("comment-a")).toBe(false);
  });

  it("deduplicates the same content revision but permits a report after content changes", async () => {
    firestoreMock.mapFor("communityProjections").set("post-a", projection);
    const mutation = { action: "report" as const, targetType: "post" as const, targetId: "post-a", reason: "privacy" as const };

    const first = await reportCommunityTarget({ uid: "reporter-a" }, mutation, new Date("2026-08-28T10:00:00.000Z"));
    const duplicate = await reportCommunityTarget({ uid: "reporter-a" }, mutation, new Date("2026-08-28T10:05:00.000Z"));
    firestoreMock.mapFor("communityProjections").set("post-a", { ...projection, title: "A changed first read" });
    const changed = await reportCommunityTarget({ uid: "reporter-a" }, mutation, new Date("2026-08-28T10:10:00.000Z"));

    expect(duplicate).toEqual({ id: first.id, duplicate: true });
    expect(changed).toEqual({ id: expect.not.stringMatching(new RegExp(`^${first.id}$`)), duplicate: false });
    expect(firestoreMock.mapFor("communityReports").size).toBe(2);
  });

  it("deletes report outbox, third-party notifications, and appeals derived from owned content", async () => {
    firestoreMock.mapFor("communityProjections").set("post-a", projection);
    firestoreMock.mapFor("communityComments").set("comment-a", {
      schemaVersion: 1,
      id: "comment-a",
      postId: "post-a",
      authorId: "other-user",
      authorName: "Peer",
      authorDeletedAt: null,
      body: "A derivative comment.",
      status: "visible",
      moderationState: "removed",
      moderationActionId: "action-a",
      cursorKey: "2026-08-28T08:01:00.000Z_comment-a",
      createdAt: "2026-08-28T08:01:00.000Z",
      updatedAt: "2026-08-28T08:01:00.000Z",
    });
    firestoreMock.mapFor("communityReports").set("report-a", { reporterId: "other-user", targetType: "comment", targetId: "comment-a" });
    firestoreMock.mapFor("communityOutbox").set("outbox-a", { targetId: "report-a" });
    firestoreMock.mapFor("communityNotifications").set("notification-a", { userId: "other-user", postId: "post-a" });
    firestoreMock.mapFor("communityModerationActions").set("action-a", { targetType: "comment", targetId: "comment-a" });
    firestoreMock.mapFor("communityAppeals").set("appeal-a", { actionId: "action-a", appellantId: "other-user" });

    await expect(deleteCommunityDataForUser("owner-a")).resolves.toEqual(expect.objectContaining({ postsDeleted: 1 }));

    expect(firestoreMock.mapFor("communityReports").size).toBe(0);
    expect(firestoreMock.mapFor("communityOutbox").size).toBe(0);
    expect(firestoreMock.mapFor("communityNotifications").size).toBe(0);
    expect(firestoreMock.mapFor("communityModerationActions").size).toBe(0);
    expect(firestoreMock.mapFor("communityAppeals").size).toBe(0);
  });

  it("reconciles another author's counters after deleting comments and interactions", async () => {
    firestoreMock.mapFor("communityProjections").set("post-b", {
      ...projection,
      ownerId: "other-owner",
      postId: "post-b",
      stats: { comments: 1, likes: 1, saves: 0 },
    });
    firestoreMock.mapFor("communityComments").set("comment-own", {
      schemaVersion: 1,
      id: "comment-own",
      postId: "post-b",
      authorId: "owner-a",
      authorName: "Designer",
      authorDeletedAt: null,
      body: "A useful comment",
      status: "visible",
      moderationState: "clear",
      moderationActionId: null,
      cursorKey: "2026-08-28T08:00:00.000Z_comment-own",
      createdAt: "2026-08-28T08:00:00.000Z",
      updatedAt: "2026-08-28T08:00:00.000Z",
    });
    firestoreMock.mapFor("communityInteractions").set("interaction-own", {
      schemaVersion: 1,
      id: "interaction-own",
      postId: "post-b",
      userId: "owner-a",
      type: "liked",
      active: true,
      updatedAt: "2026-08-28T08:00:00.000Z",
    });
    firestoreMock.mapFor("communityCounterShards").set("post-b.0", {
      schemaVersion: 1,
      postId: "post-b",
      shard: 0,
      comments: 1,
      likes: 1,
      saves: 0,
      updatedAt: "2026-08-28T08:00:00.000Z",
    });

    await expect(deleteCommunityDataForUser("owner-a")).resolves.toEqual(expect.objectContaining({
      commentsDeleted: 1,
      interactionsDeleted: 1,
    }));

    expect(firestoreMock.mapFor("communityProjections").get("post-b")).toEqual(expect.objectContaining({
      stats: { comments: 0, likes: 0, saves: 0 },
    }));
    expect(firestoreMock.mapFor("communityCounterShards").size).toBe(16);
  });

  it("rejects self-reports and nonexistent account targets", async () => {
    firestoreMock.mapFor("communityProjections").set("post-a", projection);
    await expect(reportCommunityTarget({ uid: "owner-a" }, {
      action: "report",
      targetType: "post",
      targetId: "post-a",
      reason: "privacy",
    })).rejects.toMatchObject({ status: 400 });

    await expect(reportCommunityTarget({ uid: "user-a" }, {
      action: "report",
      targetType: "account",
      targetId: "user-a",
      reason: "harassment",
    })).rejects.toMatchObject({ status: 400 });

    authMock.getUser.mockRejectedValue(new Error("not found"));
    await expect(reportCommunityTarget({ uid: "user-a" }, {
      action: "report",
      targetType: "account",
      targetId: "missing-user",
      reason: "harassment",
    })).rejects.toMatchObject({ status: 404 });
  });

  it("does not let a newer report overwrite a removed target during appeal resolution", async () => {
    firestoreMock.mapFor("communityProjections").set("post-a", {
      ...projection,
      visibility: "hidden",
      moderationState: "removed",
      moderationActionId: "remove-action",
    });

    await expect(reportCommunityTarget({ uid: "reporter-a" }, {
      action: "report",
      targetType: "post",
      targetId: "post-a",
      reason: "spam",
    })).rejects.toMatchObject({ status: 404 });
    expect(firestoreMock.mapFor("communityReports").size).toBe(0);
  });

  it("never republishes an author-deleted comment through moderator restore", async () => {
    process.env.IROGUIDE_COMMUNITY_MODERATOR_UIDS = "moderator-a";
    firestoreMock.mapFor("communityComments").set("comment-a", {
      schemaVersion: 1,
      id: "comment-a",
      postId: "post-a",
      authorId: "owner-a",
      authorName: "Designer",
      authorDeletedAt: "2026-08-28T08:02:00.000Z",
      body: "Deleted by author",
      status: "deleted",
      moderationState: "clear",
      moderationActionId: null,
      cursorKey: "2026-08-28T08:01:00.000Z_comment-a",
      createdAt: "2026-08-28T08:01:00.000Z",
      updatedAt: "2026-08-28T08:02:00.000Z",
    });

    await expect(applyCommunityModerationCommand("moderator-a", {
      command: "act",
      action: "restore",
      targetType: "comment",
      targetId: "comment-a",
      reasonCode: "appeal-approved",
    })).rejects.toMatchObject({ status: 409 });
    await expect(applyCommunityModerationCommand("moderator-a", {
      command: "act",
      action: "remove",
      targetType: "comment",
      targetId: "comment-a",
      reasonCode: "spam",
    })).rejects.toMatchObject({ status: 409 });
    expect(firestoreMock.mapFor("communityComments").get("comment-a")).toEqual(expect.objectContaining({ status: "deleted" }));
  });

  it("rejects an appeal reversal after a newer moderation action supersedes the original", async () => {
    process.env.IROGUIDE_COMMUNITY_MODERATOR_UIDS = "moderator-a,senior-a";
    process.env.IROGUIDE_COMMUNITY_SENIOR_MODERATOR_UIDS = "senior-a";
    firestoreMock.mapFor("communityComments").set("comment-a", {
      schemaVersion: 1,
      id: "comment-a",
      postId: "post-a",
      authorId: "owner-a",
      authorName: "Designer",
      authorDeletedAt: null,
      body: "A comment under review.",
      status: "removed",
      moderationState: "removed",
      moderationActionId: "newer-action",
      cursorKey: "2026-08-28T08:01:00.000Z_comment-a",
      createdAt: "2026-08-28T08:01:00.000Z",
      updatedAt: "2026-08-28T08:03:00.000Z",
    });
    firestoreMock.mapFor("communityModerationActions").set("original-action", {
      schemaVersion: 1,
      id: "original-action",
      action: "remove",
      targetType: "comment",
      targetId: "comment-a",
      reasonCode: "harassment",
      auditEventId: "audit-original",
      moderatorId: "moderator-a",
      reversalOfActionId: null,
      createdAt: "2026-08-28T08:02:00.000Z",
    });
    firestoreMock.mapFor("communityAppeals").set("appeal-a", {
      schemaVersion: 1,
      id: "appeal-a",
      actionId: "original-action",
      appellantId: "owner-a",
      reason: "Please review the context.",
      status: "queued",
      originalModeratorId: "moderator-a",
      reviewerId: null,
      createdAt: "2026-08-28T08:04:00.000Z",
      updatedAt: "2026-08-28T08:04:00.000Z",
    });

    await expect(applyCommunityModerationCommand("senior-a", {
      command: "resolve-appeal",
      appealId: "appeal-a",
      outcome: "reverse",
      reasonCode: "context-reviewed",
    })).rejects.toMatchObject({ status: 409 });
    expect(firestoreMock.mapFor("communityComments").get("comment-a")).toEqual(expect.objectContaining({ moderationActionId: "newer-action", status: "removed" }));
  });

  it("binds a moderation resolution to the exact queued report target", async () => {
    process.env.IROGUIDE_COMMUNITY_MODERATOR_UIDS = "moderator-a";
    firestoreMock.mapFor("communityProjections").set("post-a", projection);
    firestoreMock.mapFor("communityReports").set("report-a", {
      schemaVersion: 1,
      id: "report-a",
      reporterId: "reporter-a",
      targetType: "post",
      targetId: "post-b",
      reason: "spam",
      deduplicationKey: "a".repeat(64),
      status: "queued",
      resolutionActionId: null,
      resolverId: null,
      queueEnteredAt: "2026-08-28T08:00:00.000Z",
      updatedAt: "2026-08-28T08:00:00.000Z",
    });

    await expect(applyCommunityModerationCommand("moderator-a", {
      command: "act",
      action: "remove",
      targetType: "post",
      targetId: "post-a",
      reportId: "report-a",
      reasonCode: "spam",
    })).rejects.toMatchObject({ status: 409 });
    expect(firestoreMock.mapFor("communityProjections").get("post-a")).toEqual(expect.objectContaining({ visibility: "public" }));
  });

  it("treats a missing false interaction as idempotent instead of decrementing a counter", async () => {
    firestoreMock.mapFor("communityProjections").set("post-a", projection);

    await expect(setCommunityInteraction({ uid: "viewer-a" }, {
      action: "interaction",
      key: "liked",
      postId: "post-a",
      value: false,
    })).resolves.toEqual({ active: false });

    expect(firestoreMock.mapFor("communityInteractions").size).toBe(0);
    expect(firestoreMock.mapFor("communityCounterShards").size).toBe(0);
  });
});
