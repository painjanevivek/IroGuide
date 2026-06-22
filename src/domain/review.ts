import { z } from "zod";

export const reviewCategories = [
  "logo", "poster", "social", "ui", "website", "book-cover", "packaging", "other",
] as const;

export const feedbackModes = ["friendly", "mentor", "direct"] as const;

export const reviewRequestSchema = z.object({
  category: z.enum(reviewCategories),
  mode: z.enum(feedbackModes),
  file: z.object({
    name: z.string().min(1).max(180),
    type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z.number().int().positive().max(10 * 1024 * 1024),
  }),
  brief: z.object({
    audience: z.string().trim().min(3).max(300),
    purpose: z.string().trim().min(3).max(500),
    style: z.string().trim().min(2).max(200),
    goal: z.string().trim().min(3).max(500),
    concern: z.string().trim().max(500).optional(),
  }),
});

export const reviewIssueSchema = z.object({
  category: z.string(),
  score: z.number().min(0).max(10),
  priority: z.enum(["high", "medium", "low"]),
  observation: z.string(),
  impact: z.string(),
  recommendation: z.string(),
  actions: z.array(z.string()).min(1),
});

export const reviewOutputSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  overallScore: z.number().min(0).max(10),
  summary: z.string(),
  strengths: z.array(z.string()).min(1),
  scores: z.array(z.object({ label: z.string(), score: z.number().min(0).max(10) })),
  issues: z.array(reviewIssueSchema).min(1),
  checklist: z.array(z.object({ label: z.string(), priority: z.enum(["high", "medium", "low"]) })),
  followUps: z.array(z.string()),
  provider: z.literal("demo"),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;

export const categoryLabels: Record<(typeof reviewCategories)[number], string> = {
  logo: "Logo",
  poster: "Poster",
  social: "Social media",
  ui: "UI/UX screen",
  website: "Website",
  "book-cover": "Book cover",
  packaging: "Packaging",
  other: "Other",
};
