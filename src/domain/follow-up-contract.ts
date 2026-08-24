import { z } from "zod";

export const followUpContractVersion = 1 as const;
export const followUpLimits = Object.freeze({
  maxHistoryCharacters: 6_000,
  maxMessages: 12,
  maxMessageCharacters: 800,
  maxQuestionCharacters: 600,
});

export const providerNeutralMessageSchema = z.strictObject({
  id: z.string().min(1).max(200),
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(followUpLimits.maxMessageCharacters),
  createdAt: z.iso.datetime({ offset: true }),
});

export const liveFollowUpRequestSchema = z.strictObject({
  schemaVersion: z.literal(followUpContractVersion),
  reviewDocumentId: z.string().min(1).max(700),
  question: z.string().trim().min(3).max(followUpLimits.maxQuestionCharacters),
  messages: z.array(providerNeutralMessageSchema).max(followUpLimits.maxMessages),
  idempotencyKey: z.string().min(16).max(128),
}).superRefine((request, context) => {
  const historyCharacters = request.messages.reduce((total, message) => total + message.content.length, 0);
  if (historyCharacters > followUpLimits.maxHistoryCharacters) {
    context.addIssue({ code: "custom", message: "Conversation history exceeds the character budget.", path: ["messages"] });
  }
});

export const liveFollowUpOutputSchema = z.strictObject({
  schemaVersion: z.literal(followUpContractVersion),
  reviewDocumentId: z.string().min(1).max(700),
  message: providerNeutralMessageSchema.extend({ role: z.literal("assistant") }),
  citedIssueIds: z.array(z.string().min(1).max(200)).max(8),
  provider: z.string().min(1).max(80),
});

export function assertOwnedReviewContext(userId: string, review: { userId: string }) {
  if (review.userId !== userId) throw new ReviewContextOwnershipError();
  return review;
}

export class ReviewContextOwnershipError extends Error {
  constructor() {
    super("The requested review does not belong to this account.");
    this.name = "ReviewContextOwnershipError";
  }
}
