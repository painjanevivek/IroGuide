import { z } from "zod";

export const reviewFindingVerdicts = ["helpful", "not-helpful"] as const;
export const reviewFindingFeedbackReasons = ["inaccurate", "too-vague", "not-actionable", "wrong-priority", "already-known"] as const;

export const reviewFindingFeedbackSchema = z.strictObject({
  reviewDocumentId: z.string().trim().min(1).max(700),
  issueId: z.string().trim().min(1).max(180),
  verdict: z.enum(reviewFindingVerdicts),
  reason: z.enum(reviewFindingFeedbackReasons).optional(),
});

export type ReviewFindingFeedback = z.infer<typeof reviewFindingFeedbackSchema>;

export function getReviewFindingFeedbackId(userId: string, feedback: ReviewFindingFeedback) {
  return [userId, feedback.reviewDocumentId, feedback.issueId]
    .map((part) => part.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 220) || "feedback")
    .join("_");
}
