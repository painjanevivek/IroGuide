import { z } from "zod";
import { reviewOutputSchema, reviewRequestSchema } from "./review";

export const comparisonRequestSchema = z.object({
  originalReview: reviewOutputSchema,
  revisedFile: reviewRequestSchema.shape.file,
});

export const comparisonOutputSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  originalReviewId: z.string().min(1),
  revisedUploadId: z.string().min(1),
  originalScore: z.number().min(0).max(10),
  revisedScore: z.number().min(0).max(10),
  scoreDelta: z.number(),
  summary: z.string().min(1),
  improved: z.array(z.string()).min(1),
  remainingIssues: z.array(z.string()).min(1),
  regressions: z.array(z.string()),
  nextAction: z.string().min(1),
  provider: z.literal("demo"),
});

export type ComparisonRequest = z.infer<typeof comparisonRequestSchema>;
export type ComparisonOutput = z.infer<typeof comparisonOutputSchema>;
