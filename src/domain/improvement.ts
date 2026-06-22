import { z } from "zod";
import { reviewOutputSchema } from "./review";

const improvementTargetSchema = z.enum(["human-designer", "image-tool", "ui-tool"]);

const improvementStepSchema = z.object({
  order: z.number().int().positive(),
  title: z.string(),
  rationale: z.string(),
  actions: z.array(z.string()),
});

export const improvementRequestSchema = z.object({
  review: reviewOutputSchema,
  target: improvementTargetSchema,
});

export const improvementOutputSchema = z.object({
  title: z.string(),
  steps: z.array(improvementStepSchema).min(1),
  prompt: z.string().min(80),
  solvedIssues: z.array(z.string()),
  manualChecks: z.array(z.string()),
  provider: z.literal("demo"),
});

export type ImprovementRequest = z.infer<typeof improvementRequestSchema>;
export type ImprovementOutput = z.infer<typeof improvementOutputSchema>;
