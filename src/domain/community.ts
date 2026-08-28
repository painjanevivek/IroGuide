import { z } from "zod";

export const communityCommentSchema = z.object({
  authorId: z.string().min(1),
  authorName: z.string().min(1).max(80),
  body: z.string().trim().min(2).max(500),
});

const communityDocumentIdSchema = z.string().regex(/^[A-Za-z0-9_.-]+$/).max(320);

function hasAcceptableCommunityText(value: string) {
  const links = value.match(/https?:\/\/|www\./gi)?.length ?? 0;
  const mentions = value.match(/(^|\s)@[A-Za-z0-9_.-]+/g)?.length ?? 0;
  return links <= 2 && mentions <= 5;
}

const communityNoteSchema = z.string().trim().min(1).max(420).refine(hasAcceptableCommunityText, {
  message: "Community text contains too many links or mentions.",
});
const communityCommentBodySchema = z.string().trim().min(2).max(500).refine(hasAcceptableCommunityText, {
  message: "Community text contains too many links or mentions.",
});

export const communityMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("publish"),
    reviewId: communityDocumentIdSchema,
    consent: z.literal(true),
    consentVersion: z.literal("community-consent-v1"),
    title: z.string().trim().min(3).max(120).optional(),
    note: communityNoteSchema.optional(),
  }).strict(),
  z.object({ action: z.literal("edit-post"), postId: communityDocumentIdSchema, title: z.string().trim().min(3).max(120), note: communityNoteSchema.optional() }).strict(),
  z.object({ action: z.literal("delete-post"), postId: communityDocumentIdSchema }).strict(),
  z.object({ action: z.literal("withdraw-consent"), postId: communityDocumentIdSchema }).strict(),
  z.object({
    action: z.literal("comment"),
    postId: communityDocumentIdSchema,
    body: communityCommentBodySchema,
  }).strict(),
  z.object({ action: z.literal("delete-comment"), postId: communityDocumentIdSchema, commentId: communityDocumentIdSchema }).strict(),
  z.object({
    action: z.literal("interaction"),
    postId: communityDocumentIdSchema,
    key: z.enum(["liked", "saved", "shared"]),
    value: z.boolean(),
  }).strict(),
  z.object({ action: z.literal("block"), accountId: z.string().min(1).max(128) }).strict(),
  z.object({ action: z.literal("unblock"), accountId: z.string().min(1).max(128) }).strict(),
  z.object({ action: z.literal("appeal"), actionId: communityDocumentIdSchema, reason: z.string().trim().min(3).max(1_000) }).strict(),
  z.object({
    action: z.literal("report"),
    targetType: z.enum(["post", "comment", "account"]),
    targetId: communityDocumentIdSchema,
    reason: z.enum(["harassment", "hate", "spam", "privacy", "copyright", "self-harm", "other"]),
    details: z.string().trim().max(800).optional(),
  }).strict(),
]);

export type CommunityCommentInput = z.infer<typeof communityCommentSchema>;
export type CommunityMutation = z.infer<typeof communityMutationSchema>;
