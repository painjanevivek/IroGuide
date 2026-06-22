import { z } from "zod";
import { reviewOutputSchema } from "./review";

export const followUpMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(1200),
  createdAt: z.string().min(1),
});

export const followUpRequestSchema = z.object({
  review: reviewOutputSchema,
  question: z.string().trim().min(3).max(600),
  messages: z.array(followUpMessageSchema).max(20).default([]),
});

export const followUpOutputSchema = z.object({
  message: followUpMessageSchema.extend({ role: z.literal("assistant") }),
  suggestedQuestions: z.array(z.string().min(1).max(120)).max(4),
  provider: z.literal("demo"),
});

export type FollowUpMessage = z.infer<typeof followUpMessageSchema>;
export type FollowUpRequest = z.infer<typeof followUpRequestSchema>;
export type FollowUpOutput = z.infer<typeof followUpOutputSchema>;
