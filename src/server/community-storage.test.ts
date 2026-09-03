import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { createDemoReview } from "@/domain/demo-review";
import type { ReviewRequest } from "@/domain/review";
import { createStoredReviewDocument } from "@/domain/review-storage";
import { AccountDeletionInProgressError } from "./account-deletion-lock";
import { createTrustedReviewDocument } from "./review-provenance";
import { CommunityMutationError, mutateCommunity } from "./community-storage";

const firestoreMock = vi.hoisted(() => {
  const created: Array<{ path: string; value: Record<string, unknown> }> = [];
  let deletionLocked = false;
  let reviewSnapshot: unknown;
  const reference = (path: string) => ({ id: path.split("/").at(-1), path });
  const db = {
    collection: vi.fn((name: string) => ({ doc: vi.fn((id: string) => reference(`${name}/${id}`)) })),
    runTransaction: vi.fn(async (work: (transaction: unknown) => Promise<unknown>) => work({
      create: (ref: { path: string }, value: Record<string, unknown>) => created.push({ path: ref.path, value }),
      get: async (ref: { path: string }) => ref.path.startsWith("reviews/")
        ? reviewSnapshot
        : { exists: ref.path.startsWith("reviewDeletionLocks/") && deletionLocked, data: () => undefined },
    })),
  };
  return {
    created,
    db,
    setDeletionLocked: (value: boolean) => { deletionLocked = value; },
    setReviewSnapshot: (value: unknown) => { reviewSnapshot = value; },
  };
});

vi.mock("@/server/firebase-admin", () => ({ getFirebaseAdminFirestore: () => firestoreMock.db }));

const request: ReviewRequest = {
  category: "logo",
  mode: "mentor",
  file: { name: "mark.png", type: "image/png", size: 1024 },
  brief: {
    audience: "Independent designers",
    purpose: "Evaluate a brand mark",
    style: "Bold minimal identity",
    goal: "Improve first impression",
    concern: "",
  },
};

const publishInput = {
  action: "publish" as const,
  consent: true as const,
  consentVersion: "community-consent-v1" as const,
  reviewId: "review-1",
};

describe("community review publication", () => {
  beforeEach(() => {
    process.env.IROGUIDE_COMMUNITY_AUDIT_HMAC_KEY = "a-secure-test-audit-key-that-is-long-enough";
    firestoreMock.created.length = 0;
    firestoreMock.setDeletionLocked(false);
    firestoreMock.db.collection.mockClear();
    firestoreMock.db.runTransaction.mockClear();
  });

  it.each([
    ["missing", { exists: false }],
    ["non-owned", {
      exists: true,
      data: () => createTrustedReviewDocument({ category: "logo", review: createDemoReview(request), userId: "user-b" }),
    }],
  ])("returns 404 for a %s review without exposing ownership", async (_name, snapshot) => {
    firestoreMock.setReviewSnapshot(snapshot);
    await expect(mutateCommunity({ uid: "user-a" }, publishInput))
      .rejects.toEqual(expect.objectContaining<Partial<CommunityMutationError>>({ status: 404 }));
    expect(firestoreMock.created).toHaveLength(0);
  });

  it("returns 409 for an owned legacy review without server provenance", async () => {
    firestoreMock.setReviewSnapshot({
      exists: true,
      data: () => createStoredReviewDocument({ category: "logo", review: createDemoReview(request), userId: "user-a" }),
    });
    await expect(mutateCommunity({ uid: "user-a" }, publishInput))
      .rejects.toEqual(expect.objectContaining<Partial<CommunityMutationError>>({ status: 409 }));
    expect(firestoreMock.created).toHaveLength(0);
  });

  it("stores only a strict public projection plus separate consent and minimized audit", async () => {
    const document = createTrustedReviewDocument({ category: "logo", review: createDemoReview(request), userId: "user-a" });
    firestoreMock.setReviewSnapshot({ exists: true, data: () => document });
    await expect(mutateCommunity({ uid: "user-a", name: "Designer" }, publishInput))
      .resolves.toEqual({ id: expect.any(String) });

    const projection = firestoreMock.created.find((item) => item.path.startsWith("communityProjections/"))?.value;
    const consent = firestoreMock.created.find((item) => item.path.startsWith("communityConsents/"))?.value;
    const audit = firestoreMock.created.find((item) => item.path.startsWith("communityAudit/"))?.value;
    expect(projection).toEqual(expect.objectContaining({
      category: "Logo",
      consent: expect.objectContaining({ version: "community-consent-v1" }),
      critiqueExcerpt: document.review.summary,
      ownerId: "user-a",
      sourceReviewId: "review-1",
    }));
    expect(projection).not.toHaveProperty("review");
    expect(projection).not.toHaveProperty("userId");
    expect(consent).toEqual(expect.objectContaining({ state: "active", userId: "user-a" }));
    expect(audit).toEqual(expect.objectContaining({ actorHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(audit).not.toHaveProperty("actorId");
  });

  it("requires explicit versioned consent and rejects client-supplied review content", async () => {
    await expect(mutateCommunity({ uid: "user-a" }, { action: "publish", reviewId: "review-1" })).rejects.toBeInstanceOf(ZodError);
    await expect(mutateCommunity({ uid: "user-a" }, { ...publishInput, review: createDemoReview(request) })).rejects.toBeInstanceOf(ZodError);
    expect(firestoreMock.db.runTransaction).not.toHaveBeenCalled();
  });

  it("rejects a mutation when account deletion has acquired the transaction lock", async () => {
    firestoreMock.setDeletionLocked(true);
    firestoreMock.setReviewSnapshot({
      exists: true,
      data: () => createTrustedReviewDocument({ category: "logo", review: createDemoReview(request), userId: "user-a" }),
    });

    await expect(mutateCommunity({ uid: "user-a" }, publishInput))
      .rejects.toBeInstanceOf(AccountDeletionInProgressError);
    expect(firestoreMock.created).toHaveLength(0);
  });
});
