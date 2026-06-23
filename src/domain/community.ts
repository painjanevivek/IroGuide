import { z } from "zod";
import { reviewOutputSchema } from "./review";

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
  stats: z.object({ comments: z.number().int().min(0).default(0) }).default({ comments: 0 }),
});

export const communityCommentSchema = z.object({
  authorId: z.string().min(1),
  authorName: z.string().min(1).max(80),
  body: z.string().trim().min(2).max(500),
});

export type CommunityPostInput = z.infer<typeof communityPostSchema>;
export type CommunityCommentInput = z.infer<typeof communityCommentSchema>;
