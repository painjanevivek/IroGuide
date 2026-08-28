import { describe, expect, it } from "vitest";
import {
  communityAppealSchema,
  communityAuditSchema,
  communityConsentSchema,
  communityPublicProjectionSchema,
  communityStoredProjectionSchema,
} from "./community-safety";

const now = "2026-08-24T00:00:00.000Z";

describe("community safety records", () => {
  it("keeps the public projection strict and excludes private review bodies", () => {
    const projection = {
      schemaVersion: 1,
      postId: "post-1",
      publicAuthor: { displayName: "Designer" },
      title: "A focused critique",
      category: "Website",
      critiqueExcerpt: "The primary action needs clearer contrast.",
      stats: { comments: 0, likes: 0, saves: 0 },
      publishedAt: now,
      consent: { version: "community-consent-v1", grantedAt: now, withdrawalState: "active" },
    };
    expect(communityPublicProjectionSchema.safeParse(projection).success).toBe(true);
    expect(communityPublicProjectionSchema.safeParse({ ...projection, review: { private: true } }).success).toBe(false);
    expect(communityPublicProjectionSchema.safeParse({ ...projection, publicAuthor: { displayName: "Designer", avatarUrl: "javascript:alert(1)" } }).success).toBe(false);
    expect(communityStoredProjectionSchema.safeParse({ ...projection, ownerId: "owner", sourceReviewId: "review-1", visibility: "public", moderationState: "clear", moderationActionId: null, stats: { comments: 0, likes: 0, saves: 0 }, updatedAt: now }).success).toBe(true);
  });

  it("models consent withdrawal as a derivative-deletion state", () => {
    expect(communityConsentSchema.safeParse({ schemaVersion: 1, id: "consent-1", userId: "owner", sourceReviewId: "review-1", projectionId: "post-1", consentVersion: "community-consent-v1", state: "withdrawn", grantedAt: now, withdrawnAt: now, derivativeState: "deletion-pending", updatedAt: now }).success).toBe(true);
  });

  it("requires an appeal reviewer independent from the original moderator", () => {
    const appeal = { schemaVersion: 1, id: "appeal-1", actionId: "action-1", appellantId: "owner", reason: "The removal used the wrong context.", status: "queued", originalModeratorId: "moderator-a", reviewerId: "moderator-a", createdAt: now, updatedAt: now };
    expect(communityAppealSchema.safeParse(appeal).success).toBe(false);
    expect(communityAppealSchema.safeParse({ ...appeal, reviewerId: "moderator-b" }).success).toBe(true);
  });

  it("rejects raw actor and target identifiers from audit records", () => {
    const audit = { schemaVersion: 1, id: "018f1a80-7b5a-7c61-a9be-2f38de60ec98", action: "remove", actorRole: "moderator", actorHash: "a".repeat(64), targetType: "post", targetIdHash: "b".repeat(64), reasonCode: "privacy", createdAt: now };
    expect(communityAuditSchema.safeParse(audit).success).toBe(true);
    expect(communityAuditSchema.safeParse({ ...audit, actorId: "raw-user-id" }).success).toBe(false);
  });
});
