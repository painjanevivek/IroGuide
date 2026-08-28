import { afterEach, describe, expect, it, vi } from "vitest";
import { applyCommunityModerationCommand } from "./community-moderation-storage";
import { CommunityMutationError } from "./community-projection-storage";

vi.mock("@/server/firebase-admin", () => ({
  getFirebaseAdminFirestore: vi.fn(() => { throw new Error("Firestore should not be reached for rejected roles."); }),
}));

describe("Community moderation least privilege", () => {
  afterEach(() => {
    delete process.env.IROGUIDE_COMMUNITY_MODERATOR_UIDS;
    delete process.env.IROGUIDE_COMMUNITY_SENIOR_MODERATOR_UIDS;
  });

  it("rejects users who are not configured moderators", async () => {
    await expect(applyCommunityModerationCommand("ordinary-user", {
      command: "act",
      action: "remove",
      targetType: "post",
      targetId: "post-a",
      reasonCode: "privacy",
    })).rejects.toEqual(expect.objectContaining<Partial<CommunityMutationError>>({ status: 403 }));
  });

  it("requires a separate senior role for account bans", async () => {
    process.env.IROGUIDE_COMMUNITY_MODERATOR_UIDS = "moderator-a";
    process.env.IROGUIDE_COMMUNITY_SENIOR_MODERATOR_UIDS = "moderator-b";
    await expect(applyCommunityModerationCommand("moderator-a", {
      command: "act",
      action: "ban",
      targetType: "account",
      targetId: "account-a",
      reasonCode: "repeated-abuse",
    })).rejects.toEqual(expect.objectContaining<Partial<CommunityMutationError>>({ status: 403 }));
  });
});
