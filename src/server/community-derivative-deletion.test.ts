import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCommunityDerivatives } from "./community-operations";

type StoredValue = Record<string, unknown>;
type Reference = { collectionName: string; id: string; path: string };

const firestoreMock = vi.hoisted(() => {
  const collections = new Map<string, Map<string, StoredValue>>();
  const mapFor = (name: string) => {
    const current = collections.get(name);
    if (current) return current;
    const created = new Map<string, StoredValue>();
    collections.set(name, created);
    return created;
  };
  const reference = (collectionName: string, id: string): Reference => ({ collectionName, id, path: `${collectionName}/${id}` });
  const snapshot = (ref: Reference) => ({
    data: () => mapFor(ref.collectionName).get(ref.id),
    exists: mapFor(ref.collectionName).has(ref.id),
    id: ref.id,
    ref,
  });
  const collection = vi.fn((name: string) => {
    const query = (filters: Array<[string, unknown]> = []) => {
      const builder = {
        get: async () => {
          const docs = [...mapFor(name).entries()]
            .filter(([, value]) => filters.every(([field, expected]) => value[field] === expected))
            .map(([id]) => snapshot(reference(name, id)));
          return { docs, empty: docs.length === 0, size: docs.length };
        },
        where: (field: string, _operator: string, expected: unknown) => query([...filters, [field, expected]]),
      };
      return builder;
    };
    return {
      ...query(),
      doc: (id: string) => ({
        ...reference(name, id),
        get: async () => snapshot(reference(name, id)),
      }),
    };
  });
  const batch = vi.fn(() => {
    const deletes: Reference[] = [];
    const updates: Array<{ reference: Reference; value: StoredValue }> = [];
    return {
      delete: (ref: Reference) => deletes.push(ref),
      update: (ref: Reference, value: StoredValue) => updates.push({ reference: ref, value }),
      commit: async () => {
        for (const item of updates) {
          const current = mapFor(item.reference.collectionName).get(item.reference.id) ?? {};
          mapFor(item.reference.collectionName).set(item.reference.id, { ...current, ...item.value });
        }
        for (const ref of deletes) mapFor(ref.collectionName).delete(ref.id);
      },
    };
  });
  return { batch, collection, collections, mapFor };
});

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminFirestore: () => ({
    batch: firestoreMock.batch,
    collection: firestoreMock.collection,
  }),
}));

describe("Community post derivative deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.collections.clear();
    firestoreMock.mapFor("communityProjections").set("post-a", { postId: "post-a" });
    firestoreMock.mapFor("communityComments").set("comment-a", { postId: "post-a" });
    firestoreMock.mapFor("communityInteractions").set("interaction-a", { postId: "post-a" });
    firestoreMock.mapFor("communityReports").set("report-post", { targetType: "post", targetId: "post-a" });
    firestoreMock.mapFor("communityReports").set("report-comment", { targetType: "comment", targetId: "comment-a" });
    firestoreMock.mapFor("communityNotifications").set("notification-a", { postId: "post-a" });
    firestoreMock.mapFor("communityCounterShards").set("post-a.0", { postId: "post-a" });
    firestoreMock.mapFor("communityConsents").set("consent-a", { projectionId: "post-a", derivativeState: "deletion-pending" });
    firestoreMock.mapFor("communityModerationActions").set("action-post", { targetType: "post", targetId: "post-a" });
    firestoreMock.mapFor("communityModerationActions").set("action-comment", { targetType: "comment", targetId: "comment-a" });
    firestoreMock.mapFor("communityModerationActions").set("action-unrelated", { targetType: "post", targetId: "post-z" });
    firestoreMock.mapFor("communityAppeals").set("appeal-post", { actionId: "action-post" });
    firestoreMock.mapFor("communityAppeals").set("appeal-comment", { actionId: "action-comment" });
    firestoreMock.mapFor("communityOutbox").set("outbox-post", { targetId: "post-a" });
    firestoreMock.mapFor("communityOutbox").set("outbox-comment", { targetId: "comment-a" });
    firestoreMock.mapFor("communityOutbox").set("outbox-report", { targetId: "report-comment" });
    firestoreMock.mapFor("communityOutbox").set("event-delete", { targetId: "post-a" });
  });

  it("deletes reports, outbox records, moderation actions, and appeals before completing consent", async () => {
    await deleteCommunityDerivatives("post-a", new Date("2026-08-28T10:00:00.000Z"), { excludeOutboxId: "event-delete" });

    expect(firestoreMock.mapFor("communityProjections").size).toBe(0);
    expect(firestoreMock.mapFor("communityComments").size).toBe(0);
    expect(firestoreMock.mapFor("communityReports").size).toBe(0);
    expect(firestoreMock.mapFor("communityOutbox")).toEqual(new Map([
      ["event-delete", { targetId: "post-a" }],
    ]));
    expect(firestoreMock.mapFor("communityAppeals").size).toBe(0);
    expect(firestoreMock.mapFor("communityModerationActions")).toEqual(new Map([
      ["action-unrelated", { targetType: "post", targetId: "post-z" }],
    ]));
    expect(firestoreMock.mapFor("communityConsents").get("consent-a")).toEqual(expect.objectContaining({
      derivativeState: "deleted",
      updatedAt: "2026-08-28T10:00:00.000Z",
    }));
  });
});
