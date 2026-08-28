import { describe, expect, it } from "vitest";
import { communityPublicProjectionSchema, evaluateCommunityLaunch } from "./community-safety";

const completeEvidence = {
  publicProjection: true,
  explicitConsent: true,
  authorEditDelete: true,
  commentDelete: true,
  reporting: true,
  blocking: true,
  moderatorRemoval: true,
  appeals: true,
  auditLog: true,
  abuseLimits: true,
  deletionPropagation: true,
  counterIntegrity: true,
  incidentRunbook: true,
  loadTest: true,
  endToEndTests: true,
  retentionEvidence: true,
};

describe("Community activation contracts", () => {
  it("rejects private review fields from the public projection", () => {
    const candidate = {
      schemaVersion: 1,
      postId: "post-1",
      publicAuthor: { displayName: "Designer" },
      title: "Reworked landing page",
      category: "Website",
      critiqueExcerpt: "The primary action now has a clearer first read.",
      stats: { comments: 0, likes: 0, saves: 0 },
      publishedAt: "2026-08-24T00:00:00.000Z",
      consent: { version: "community-consent-v1", grantedAt: "2026-08-24T00:00:00.000Z", withdrawalState: "active" },
      review: { private: "must never project" },
    };
    expect(communityPublicProjectionSchema.safeParse(candidate).success).toBe(false);
  });

  it("keeps launch closed when any implementation or operating gate is missing", () => {
    const result = evaluateCommunityLaunch({
      evidence: { ...completeEvidence, reporting: false },
      moderationOwnerRole: null,
      productApproval: false,
      safetyApproval: false,
    });
    expect(result.launchable).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(["reporting", "moderationOwnerRole", "productApproval", "safetyApproval"]));
  });

  it("requires every gate plus separately recorded approvals", () => {
    expect(evaluateCommunityLaunch({ evidence: completeEvidence, moderationOwnerRole: "Trust and Safety on-call", productApproval: true, safetyApproval: true }))
      .toEqual({ launchable: true, missing: [] });
  });
});
