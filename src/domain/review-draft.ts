import { z } from "zod";
import { feedbackModes, reviewCategories } from "./review";

export const reviewDraftSchema = z.object({
  userId: z.string().min(1),
  status: z.literal("draft"),
  step: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  category: z.enum(reviewCategories),
  mode: z.enum(feedbackModes),
  file: z.object({
    name: z.string().min(1).max(180),
    type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z.number().int().positive().max(10 * 1024 * 1024),
  }).optional(),
  brief: z.object({
    audience: z.string().max(300),
    purpose: z.string().max(500),
    style: z.string().max(200),
    goal: z.string().max(500),
    concern: z.string().max(500),
  }),
});

export type ReviewDraft = z.infer<typeof reviewDraftSchema>;
