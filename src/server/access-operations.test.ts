import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ documents: new Map<string, Record<string, unknown>>() }));

vi.mock("./firebase-admin", () => ({ getFirebaseAdminFirestore: async () => database() }));

import { applyReviewAccessDecision } from "./access-operations";

const now = new Date("2026-08-28T10:00:00.000Z");
const interestPath = "reviewAccessInterests/6_target_provider-alpha-v1";

describe("review access operations", () => {
  beforeEach(() => {
    state.documents.clear();
    state.documents.set(interestPath, {
      userId: "target", schemaVersion: 1, revision: 0, programVersion: "provider-alpha-v1", cohort: "freelancer",
      preferredCategory: "ui", clientWorkIntent: "client-safe-only", contactPermission: true, status: "interested",
      createdAt: now.toISOString(), updatedAt: now.toISOString(), recentMutationIds: [],
    });
  });

  it("atomically approves with immutable audit and replay safety", async () => {
    const command = { schemaVersion: 1 as const, eventId: "018f1a80-7b5a-7c61-a9be-2f38de60ec98", targetUserId: "target", expectedRevision: 0, decision: "approve" as const, reasonCode: "cohort-fit" as const };
    await expect(applyReviewAccessDecision("operator", command, now)).resolves.toMatchObject({ status: "invited", revision: 1 });
    expect(state.documents.get(`reviewAccessDecisionAudit/${command.eventId}`)).toMatchObject({ actorUserId: "operator", previousStatus: "interested", nextStatus: "invited" });
    await expect(applyReviewAccessDecision("operator", command, now)).resolves.toMatchObject({ status: "invited", revision: 1 });
    await expect(applyReviewAccessDecision("operator", { ...command, reasonCode: "safety-review" }, now)).rejects.toThrow(/event ID was already used/i);
  });

  it("denies self-approval, stale revisions, and approval without contact permission", async () => {
    const base = { schemaVersion: 1 as const, eventId: "018f1a80-7b5a-7c61-a9be-2f38de60ec98", targetUserId: "target", expectedRevision: 4, decision: "approve" as const, reasonCode: "cohort-fit" as const };
    await expect(applyReviewAccessDecision("target", base, now)).rejects.toThrow(/cannot decide their own/i);
    await expect(applyReviewAccessDecision("operator", base, now)).rejects.toMatchObject({ currentRevision: 0 });
    state.documents.set(interestPath, { ...state.documents.get(interestPath), contactPermission: false });
    await expect(applyReviewAccessDecision("operator", { ...base, expectedRevision: 0 }, now)).rejects.toThrow(/permission was revoked/i);
  });
});

function database() {
  const reference = (path: string) => ({ path });
  return {
    collection: (name: string) => ({ doc: (id: string) => reference(`${name}/${id}`) }),
    runTransaction: async (callback: (value: FakeTransaction) => unknown) => callback(transaction()),
  };
}

type FakeTransaction = {
  get: (reference: { path: string }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
  set: (reference: { path: string }, value: Record<string, unknown>) => Map<string, Record<string, unknown>>;
  create: (reference: { path: string }, value: Record<string, unknown>) => void;
};

function transaction() {
  return {
    get: async (reference: { path: string }) => ({ exists: state.documents.has(reference.path), data: () => state.documents.get(reference.path) }),
    set: (reference: { path: string }, value: Record<string, unknown>) => state.documents.set(reference.path, value),
    create: (reference: { path: string }, value: Record<string, unknown>) => {
      if (state.documents.has(reference.path)) throw Object.assign(new Error("exists"), { code: 6 });
      state.documents.set(reference.path, value);
    },
  };
}
