import { z } from "zod";
import { reviewOutputSchema } from "./review";

export const communityPostStatsSchema = z.object({
  comments: z.number().int().min(0).default(0),
  likes: z.number().int().min(0).default(0),
  saves: z.number().int().min(0).default(0),
}).default({ comments: 0, likes: 0, saves: 0 });

export const communityPostSchema = z.object({
  authorId: z.string().min(1),
  authorName: z.string().min(1).max(80),
  authorAvatarUrl: z.string().max(100_000).optional(),
  reviewId: z.string().min(1),
  title: z.string().min(3).max(120),
  note: z.string().max(420).optional(),
  category: z.string().min(1).max(80),
  visibility: z.literal("public"),
  review: reviewOutputSchema,
  stats: communityPostStatsSchema,
});

export const communityCommentSchema = z.object({
  authorId: z.string().min(1),
  authorName: z.string().min(1).max(80),
  body: z.string().trim().min(2).max(500),
});

const communityDocumentIdSchema = z.string().regex(/^[A-Za-z0-9_.-]+$/).max(320);

export const communityMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("publish"),
    reviewId: communityDocumentIdSchema,
    title: z.string().trim().min(3).max(120).optional(),
    note: z.string().trim().min(1).max(420).optional(),
  }).strict(),
  z.object({
    action: z.literal("comment"),
    postId: communityDocumentIdSchema,
    body: z.string().trim().min(2).max(500),
  }).strict(),
  z.object({
    action: z.literal("interaction"),
    postId: communityDocumentIdSchema,
    key: z.enum(["liked", "saved", "shared"]),
    value: z.boolean(),
  }).strict(),
]);

export type CommunityPostInput = z.infer<typeof communityPostSchema>;
export type CommunityCommentInput = z.infer<typeof communityCommentSchema>;
export type CommunityMutation = z.infer<typeof communityMutationSchema>;
