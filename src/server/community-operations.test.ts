import { beforeEach, describe, expect, it, vi } from "vitest";
import { communityPublicProjectionSchema } from "@/domain/community-safety";
import { dispatchNextCommunityEvent, runSyntheticCommunityIncidentExercise } from "./community-operations";

const firestoreMock = vi.hoisted(() => {
  const queryFilters: unknown[][] = [];
  const deleted = vi.fn();
  const projectionUpdate = vi.fn();
  const batchCommit = vi.fn();
  const batchUpdate = vi.fn();
  const reference = { id: "event-a" };
  let current: Record<string, unknown>;
  let terminalScenario = false;
  const document = { data: () => current, ref: reference };
  const collection = vi.fn(() => {
    const filters: unknown[][] = [];
    queryFilters.push(filters);
    const builder = {
      get: vi.fn(async () => {
        const state = filters.find((entry) => entry[0] === "state")?.[2];
        const terminal = filters.some((entry) => entry[0] === "attempt" && entry[2] === 12);
        const docs = terminalScenario && state === "leased" && terminal
          ? Array.from({ length: 25 }, (_, index) => ({ data: () => ({ ...current, attempt: 12 }), ref: { id: `terminal-${index}` } }))
          : terminalScenario && state === "leased" && !terminal
            ? [document]
            : state === "pending"
              ? [document]
              : [];
        return { docs, empty: docs.length === 0, size: docs.length };
      }),
      limit: vi.fn(() => builder),
      orderBy: vi.fn(() => builder),
      where: vi.fn((...args: unknown[]) => {
        filters.push(args);
        return builder;
      }),
    };
    return {
      ...builder,
      doc: (id: string) => ({
        id,
        get: async () => ({ exists: true }),
        update: projectionUpdate,
      }),
    };
  });
  const runTransaction = vi.fn(async (work: (transaction: {
    delete: typeof deleted;
    get: () => Promise<{ data: () => Record<string, unknown> }>;
    set: (_reference: unknown, value: Record<string, unknown>) => void;
    update: (_reference: unknown, value: Record<string, unknown>) => void;
  }) => Promise<unknown>) => work({
    delete: deleted,
    get: async () => ({ data: () => current }),
    set: (_target, value) => { current = value; },
    update: (_target, value) => { current = { ...current, ...value }; },
  }));
  return {
    collection,
    deleted,
    queryFilters,
    reset: () => {
      terminalScenario = false;
      current = {
        schemaVersion: 1,
        id: "76c62cf7-d81c-4f5d-9d3c-5e3675551ee0",
        eventType: "hide-projection",
        targetId: "post-a",
        state: "pending",
        attempt: 0,
        nextAttemptAt: "2026-08-28T09:59:00.000Z",
        leaseOwner: null,
        leaseExpiresAt: null,
        createdAt: "2026-08-28T09:59:00.000Z",
        updatedAt: "2026-08-28T09:59:00.000Z",
      };
      queryFilters.length = 0;
    },
    useTerminalScenario: () => {
      terminalScenario = true;
      current = {
        ...current,
        state: "leased",
        attempt: 1,
        leaseOwner: "crashed-worker",
        leaseExpiresAt: "2026-08-28T09:59:00.000Z",
      };
    },
    batch: () => ({ commit: batchCommit, update: batchUpdate }),
    batchUpdate,
    runTransaction,
  };
});

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminFirestore: () => ({ batch: firestoreMock.batch, collection: firestoreMock.collection, runTransaction: firestoreMock.runTransaction }),
}));

const projection = communityPublicProjectionSchema.parse({
  schemaVersion: 1,
  postId: "post-a",
  publicAuthor: { displayName: "Designer" },
  title: "A clearer first read",
  category: "Logo",
  critiqueExcerpt: "The mark reads more clearly after simplifying the silhouette.",
  stats: { comments: 0, likes: 0, saves: 0 },
  publishedAt: "2026-08-24T08:00:00.000Z",
  consent: { version: "community-consent-v1", grantedAt: "2026-08-24T08:00:00.000Z", withdrawalState: "active" },
});

describe("Community synthetic incident exercise", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.reset();
  });

  it("proves the capability-closed response without claiming a production incident", () => {
    expect(runSyntheticCommunityIncidentExercise({
      blockedAuthorId: "blocked-author",
      projections: [{ ...projection, ownerId: "blocked-author" }],
      publicReadEnabled: false,
    })).toEqual({ blockedContentHidden: true, capabilityClosed: true, discoverableCount: 0, exerciseOnly: true });
  });

  it("filters a blocked author in a synthetic staff fixture", () => {
    const result = runSyntheticCommunityIncidentExercise({
      blockedAuthorId: "blocked-author",
      projections: [{ ...projection, ownerId: "blocked-author" }, { ...projection, postId: "post-b", ownerId: "allowed-author" }],
      publicReadEnabled: true,
    });
    expect(result).toEqual({ blockedContentHidden: true, capabilityClosed: false, discoverableCount: 1, exerciseOnly: true });
  });

  it("claims only due state-indexed outbox entries and removes delivered terminal records", async () => {
    const result = await dispatchNextCommunityEvent("worker-a", new Date("2026-08-28T10:00:00.000Z"));

    expect(result).toEqual({ delivered: true, dispatched: true, eventId: "76c62cf7-d81c-4f5d-9d3c-5e3675551ee0" });
    expect(firestoreMock.queryFilters).toContainEqual([
      ["state", "==", "pending"],
      ["nextAttemptAt", "<=", "2026-08-28T10:00:00.000Z"],
    ]);
    expect(firestoreMock.queryFilters).toContainEqual([
      ["state", "==", "leased"],
      ["leaseExpiresAt", "<=", "2026-08-28T10:00:00.000Z"],
    ]);
    expect(firestoreMock.deleted).toHaveBeenCalledWith(referenceLike("event-a"));
  });

  it("terminalizes crashed final-attempt leases before claiming later retryable work", async () => {
    firestoreMock.useTerminalScenario();

    const result = await dispatchNextCommunityEvent("worker-a", new Date("2026-08-28T10:00:00.000Z"));

    expect(result).toEqual({ delivered: true, dispatched: true, eventId: "76c62cf7-d81c-4f5d-9d3c-5e3675551ee0" });
    expect(firestoreMock.batchUpdate).toHaveBeenCalledTimes(25);
    expect(firestoreMock.deleted).toHaveBeenCalledWith(referenceLike("event-a"));
  });
});

function referenceLike(id: string) {
  return expect.objectContaining({ id });
}
