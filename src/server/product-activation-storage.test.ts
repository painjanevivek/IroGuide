import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ db: null as unknown as FakeFirestore }));

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminFirestore: () => Promise.resolve(state.db),
}));

vi.mock("./account-deletion-lock", () => ({
  ACCOUNT_DELETION_LOCKS_COLLECTION: "reviewDeletionLocks",
  assertAccountDeletionUnlocked: vi.fn(),
  assertAccountDeletionUnlockedInTransaction: vi.fn(),
}));

import {
  ActivationConflictError,
  ActivationDeletionIncompleteError,
  deleteActivationDataForUser,
  getActivationSupportAggregates,
  importLegacyDesignBrief,
  patchAccountExperience,
  putDesignBrief,
} from "./product-activation-storage";

describe("product activation persistence", () => {
  beforeEach(() => {
    state.db = new FakeFirestore();
  });

  it("applies a mutation once and rejects a genuinely stale version", async () => {
    const input = {
      schemaVersion: 1 as const,
      expectedRevision: 0,
      mutationId: "mutation-123",
      action: "update" as const,
      changes: { primaryRole: "freelancer" as const },
    };

    const first = await patchAccountExperience("owner", input, new Date("2026-08-28T10:00:00.000Z"));
    const replay = await patchAccountExperience("owner", input, new Date("2026-08-28T10:01:00.000Z"));
    expect(first.experience.revision).toBe(1);
    expect(replay.experience.revision).toBe(1);
    expect(replay.experience.primaryRole).toBe("freelancer");

    await expect(patchAccountExperience("owner", {
      ...input,
      mutationId: "mutation-456",
      changes: { primaryRole: "beginner-designer" },
    })).rejects.toMatchObject({ name: "ActivationConflictError", currentRevision: 1 } satisfies Partial<ActivationConflictError>);
  });

  it("collapses concurrent duplicate mutations into one revision", async () => {
    const input = {
      schemaVersion: 1 as const,
      expectedRevision: 0,
      mutationId: "same-mutation-123",
      action: "update" as const,
      changes: { primaryGoal: "improve-ui" as const },
    };
    const [left, right] = await Promise.all([
      patchAccountExperience("owner", input),
      patchAccountExperience("owner", input),
    ]);
    expect(left.experience.revision).toBe(1);
    expect(right.experience.revision).toBe(1);
  });

  it("merges only valid unexpired guest progress and keeps it owner scoped", async () => {
    const bundle = await patchAccountExperience("owner", {
      schemaVersion: 1,
      expectedRevision: 0,
      mutationId: "guest-merge-123",
      action: "update",
      changes: {},
      guestProgress: {
        schemaVersion: 1,
        sampleId: "form-together-friendly",
        sampleVersion: "v1",
        activeFindingId: "finding-1",
        revealedFindingIds: ["finding-1"],
        checkedActionIds: ["action-1"],
        reflectionChoice: "needs-practice",
        createdAt: "2026-08-27T10:00:00.000Z",
        updatedAt: "2026-08-27T10:05:00.000Z",
      },
    }, new Date("2026-08-28T10:00:00.000Z"));

    expect(bundle.sampleProgress).toHaveLength(1);
    expect(bundle.sampleProgress[0]).toMatchObject({ userId: "owner", checkedActionIds: ["action-1"] });
    expect(state.db.has("sampleCritiqueProgress/5_owner_form-together-friendly_v1")).toBe(true);
  });

  it("uses unambiguous owner-prefixed document IDs", async () => {
    const base = {
      schemaVersion: 1 as const, expectedRevision: null, mutationId: "mutation-123", category: "ui" as const,
      audience: "Designers", purpose: "Practice", style: "Clear", goal: "Improve", concern: "Hierarchy",
      constraints: "", mode: "mentor" as const, step: 1, flowVersion: "brief-v1" as const, status: "draft" as const,
    };
    await putDesignBrief("a_b", { ...base, id: "c" });
    await putDesignBrief("a", { ...base, id: "b_c", mutationId: "mutation-456" });
    expect(state.db.has("designBriefDrafts/3_a_b_c")).toBe(true);
    expect(state.db.has("designBriefDrafts/1_a_b_c")).toBe(true);
  });

  it("imports a legacy brief only after verifying the new record and retains the source", async () => {
    state.db.seed("reviewDrafts/owner_active", {
      userId: "owner",
      category: "ui",
      mode: "mentor",
      step: 2,
      brief: { audience: "Beginners", purpose: "Practice", style: "Clear", goal: "Improve", concern: "Hierarchy" },
    });

    const imported = await importLegacyDesignBrief("owner", new Date("2026-08-28T10:00:00.000Z"));
    expect(imported).toMatchObject({ id: "legacy-active", importedFromLegacy: true, userId: "owner" });
    expect(state.db.has("reviewDrafts/owner_active")).toBe(true);
    expect(state.db.has("designBriefDrafts/5_owner_legacy-active")).toBe(true);
  });

  it("keeps the deletion lock and returns retry evidence after an injected failure", async () => {
    state.db.seed("accountExperiences/owner", { userId: "owner" });
    state.db.seed("designBriefDrafts/owner_brief-a", { userId: "owner" });
    state.db.seed("selfReviewSessions/owner_session-a", { userId: "owner" });
    state.db.seed("reviewAccessDecisionAudit/event-a", { targetUserId: "owner", actorUserId: "operator" });
    state.db.failNextQuery("designBriefDrafts");

    await expect(deleteActivationDataForUser("owner")).rejects.toMatchObject({
      name: "ActivationDeletionIncompleteError",
      result: expect.objectContaining({ failures: ["briefs"], status: "retry-required" }),
    } satisfies Partial<ActivationDeletionIncompleteError>);
    expect(state.db.has("reviewDeletionLocks/owner")).toBe(true);
    expect(state.db.has("designBriefDrafts/owner_brief-a")).toBe(true);
    expect(state.db.has("reviewAccessDecisionAudit/event-a")).toBe(false);

    await expect(deleteActivationDataForUser("owner")).resolves.toMatchObject({ failures: [], status: "complete", briefsDeleted: 1, decisionAuditDeleted: 0 });
    expect(state.db.has("designBriefDrafts/owner_brief-a")).toBe(false);
    expect(state.db.has("reviewDeletionLocks/owner")).toBe(true);
  });

  it("returns only bounded categorical support aggregates", async () => {
    state.db.seed("reviewAccessInterests/owner_provider-alpha-v1", validInterestRecord());
    state.db.seed("selfReviewSessions/owner_session-a", validSelfReviewRecord());
    state.db.seed("designBriefDrafts/owner_brief-a", validBriefRecord());

    await expect(getActivationSupportAggregates()).resolves.toEqual(expect.objectContaining({
      bounded: true,
      truncated: false,
      byCohort: { freelancer: 1 },
      byInterestStatus: expect.objectContaining({ interested: 1 }),
      selfReviewsByCategory: { ui: 1 },
      briefsByStatus: { draft: 1 },
      observedRecords: 3,
    }));
  });
});

function validInterestRecord() {
  return {
    userId: "owner", schemaVersion: 1, revision: 0, programVersion: "provider-alpha-v1", cohort: "freelancer",
    preferredCategory: "ui", clientWorkIntent: "client-safe-only", contactPermission: true, status: "interested",
    createdAt: "2026-08-28T10:00:00.000Z", updatedAt: "2026-08-28T10:00:00.000Z", recentMutationIds: ["mutation-123"],
  };
}

function validSelfReviewRecord() {
  return {
    id: "session-a", userId: "owner", schemaVersion: 1, revision: 0, rubricVersion: "rubric-v1", category: "ui",
    goalLabel: "", responses: [], priorityItemIds: [], status: "draft", createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z", recentMutationIds: ["mutation-123"],
  };
}

function validBriefRecord() {
  return {
    id: "brief-a", userId: "owner", schemaVersion: 1, revision: 0, category: "ui", audience: "Designers",
    purpose: "Practice", style: "Clear", goal: "Improve hierarchy", concern: "Clarity", constraints: "None",
    mode: "mentor", step: 1, flowVersion: "brief-v1", status: "draft", createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z", recentMutationIds: ["mutation-123"], importedFromLegacy: false,
  };
}

class FakeFirestore {
  private readonly records = new Map<string, Record<string, unknown>>();
  private readonly queryFailures = new Set<string>();

  collection(name: string) {
    return new FakeCollection(this, name);
  }

  runTransaction<T>(work: (transaction: FakeTransaction) => Promise<T>) {
    return work(new FakeTransaction(this));
  }

  batch() {
    const deletes: FakeDocumentReference[] = [];
    return {
      delete: (reference: FakeDocumentReference) => { deletes.push(reference); },
      commit: async () => { deletes.forEach((reference) => this.remove(reference.path)); },
    };
  }

  seed(path: string, data: Record<string, unknown>) { this.records.set(path, structuredClone(data)); }
  has(path: string) { return this.records.has(path); }
  read(path: string) { return this.records.get(path); }
  write(path: string, data: Record<string, unknown>, merge = false) {
    this.records.set(path, merge ? { ...this.records.get(path), ...structuredClone(data) } : structuredClone(data));
  }
  remove(path: string) { this.records.delete(path); }
  entries(collection: string) {
    const prefix = `${collection}/`;
    return [...this.records.entries()].filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"));
  }
  failNextQuery(collection: string) { this.queryFailures.add(collection); }
  consumeQueryFailure(collection: string) {
    if (!this.queryFailures.delete(collection)) return false;
    return true;
  }
}

class FakeCollection {
  constructor(private readonly db: FakeFirestore, readonly name: string) {}
  doc(id: string) { return new FakeDocumentReference(this.db, `${this.name}/${id}`); }
  where(field: string, _operator: string, value: unknown) { return new FakeQuery(this.db, this.name).where(field, value); }
  orderBy(field: string, direction: "asc" | "desc") { return new FakeQuery(this.db, this.name).orderBy(field, direction); }
  limit(limit: number) { return new FakeQuery(this.db, this.name).limit(limit); }
}

class FakeQuery {
  private filters: Array<[string, unknown]> = [];
  private sort: [string, "asc" | "desc"] | null = null;
  private maximum = Number.MAX_SAFE_INTEGER;
  constructor(private readonly db: FakeFirestore, private readonly collectionName: string) {}
  where(field: string, value: unknown) { this.filters.push([field, value]); return this; }
  orderBy(field: string, direction: "asc" | "desc") { this.sort = [field, direction]; return this; }
  limit(limit: number) { this.maximum = limit; return this; }
  async get() {
    if (this.db.consumeQueryFailure(this.collectionName)) throw new Error("injected query failure");
    let entries = this.db.entries(this.collectionName).filter(([, data]) => this.filters.every(([field, value]) => data[field] === value));
    if (this.sort) {
      const [field, direction] = this.sort;
      entries = entries.sort((left, right) => String(left[1][field]).localeCompare(String(right[1][field])) * (direction === "asc" ? 1 : -1));
    }
    const docs = entries.slice(0, this.maximum).map(([path]) => new FakeDocumentSnapshot(new FakeDocumentReference(this.db, path)));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

class FakeDocumentReference {
  constructor(private readonly db: FakeFirestore, readonly path: string) {}
  async get() { return new FakeDocumentSnapshot(this); }
  async set(data: Record<string, unknown>, options?: { merge?: boolean }) { this.db.write(this.path, data, options?.merge); }
  async delete() { this.db.remove(this.path); }
  data() { return this.db.read(this.path); }
}

class FakeDocumentSnapshot {
  constructor(readonly ref: FakeDocumentReference) {}
  get exists() { return this.ref.data() !== undefined; }
  data() { return this.ref.data(); }
}

class FakeTransaction {
  constructor(private readonly db: FakeFirestore) {}
  async get(reference: FakeDocumentReference) { return reference.get(); }
  set(reference: FakeDocumentReference, data: Record<string, unknown>) { this.db.write(reference.path, data); }
  create(reference: FakeDocumentReference, data: Record<string, unknown>) {
    if (this.db.has(reference.path)) throw new Error("already exists");
    this.db.write(reference.path, data);
  }
}
