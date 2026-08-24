import { describe, expect, it } from "vitest";
import { assertOwnedReviewContext, followUpLimits, liveFollowUpRequestSchema, ReviewContextOwnershipError } from "./follow-up-contract";

const message = (id: string, content: string) => ({
  id,
  role: "user" as const,
  content,
  createdAt: "2026-08-24T00:00:00.000Z",
});

describe("contextual follow-up contract", () => {
  it("accepts owned review context and rejects cross-account context", () => {
    expect(assertOwnedReviewContext("owner", { userId: "owner" })).toEqual({ userId: "owner" });
    expect(() => assertOwnedReviewContext("attacker", { userId: "owner" })).toThrow(ReviewContextOwnershipError);
  });

  it("bounds message count, individual messages, and aggregate history", () => {
    const base = { schemaVersion: 1, reviewDocumentId: "owner_review", question: "What should change first?", idempotencyKey: "1234567890abcdef" };
    expect(liveFollowUpRequestSchema.safeParse({ ...base, messages: Array.from({ length: followUpLimits.maxMessages + 1 }, (_, index) => message(String(index), "ok")) }).success).toBe(false);
    expect(liveFollowUpRequestSchema.safeParse({ ...base, messages: [message("long", "x".repeat(followUpLimits.maxMessageCharacters + 1))] }).success).toBe(false);
    expect(liveFollowUpRequestSchema.safeParse({ ...base, messages: Array.from({ length: 8 }, (_, index) => message(String(index), "x".repeat(800))) }).success).toBe(false);
  });
});
