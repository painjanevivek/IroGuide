import { z } from "zod";
import { reviewOutputSchema } from "./review";

export const improvementRequestSchema = z.object({ review: reviewOutputSchema, target: z.enum(["human-designer", "image-tool", "ui-tool"]) });
export const improvementOutputSchema = z.object({ title: z.string(), steps: z.array(z.object({ order: z.number().int().positive(), title: z.string(), rationale: z.string(), actions: z.array(z.string()) })).min(1), prompt: z.string().min(80), solvedIssues: z.array(z.string()), manualChecks: z.array(z.string()), provider: z.literal("demo") });
export type ImprovementRequest = z.infer<typeof improvementRequestSchema>;
export type ImprovementOutput = z.infer<typeof improvementOutputSchema>;
