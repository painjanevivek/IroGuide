import { describe, expect, it } from "vitest";
import { reviewFindingFeedbackSchema } from "./review-feedback";

describe("review finding feedback", () => {
  it("accepts bounded feedback without free-text prompt material", () => {
    expect(reviewFindingFeedbackSchema.parse({
      reviewDocumentId: "user_review",
      issueId: "issue-1",
      verdict: "not-helpful",
      reason: "inaccurate",
    })).toEqual({
      reviewDocumentId: "user_review",
      issueId: "issue-1",
      verdict: "not-helpful",
      reason: "inaccurate",
    });
  });

  it("rejects unbounded text and invalid verdicts", () => {
    expect(reviewFindingFeedbackSchema.safeParse({
      reviewDocumentId: "user_review",
      issueId: "issue-1",
      verdict: "rewrite-the-model",
      reason: "a".repeat(1000),
    }).success).toBe(false);
  });
});
