import { describe, expect, it } from "vitest";
import { communityMutationSchema } from "./community";

describe("community mutations", () => {
  it("accepts only the client fields needed to publish, comment, or react", () => {
    expect(communityMutationSchema.safeParse({ action: "publish", reviewId: "user_review-1", title: "A clear critique" }).success).toBe(true);
    expect(communityMutationSchema.safeParse({ action: "comment", postId: "post-1", body: "Specific and useful feedback." }).success).toBe(true);
    expect(communityMutationSchema.safeParse({ action: "interaction", postId: "post-1", key: "liked", value: true }).success).toBe(true);
  });

  it("rejects forged ownership and invalid document identifiers", () => {
    expect(communityMutationSchema.safeParse({ action: "publish", reviewId: "review-1", authorId: "another-user" }).success).toBe(false);
    expect(communityMutationSchema.safeParse({ action: "comment", postId: "../post", body: "Specific feedback" }).success).toBe(false);
  });
});
