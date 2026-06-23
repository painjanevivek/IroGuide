import { z } from "zod";

export const reviewCategories = [
  "logo", "poster", "social", "ui", "website", "book-cover", "packaging", "other",
] as const;

export type ReviewCategory = (typeof reviewCategories)[number];

export const feedbackModes = ["friendly", "mentor", "direct"] as const;

const maxImageBase64Length = Math.ceil((10 * 1024 * 1024 * 4) / 3) + 16;

export const reviewFileSchema = z.object({
  name: z.string().min(1).max(180),
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});

export const reviewBriefSchema = z.object({
  audience: z.string().trim().min(3).max(300),
  purpose: z.string().trim().min(3).max(500),
  style: z.string().trim().min(2).max(200),
  goal: z.string().trim().min(3).max(500),
  concern: z.string().trim().max(500).optional(),
});

export const reviewImageSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  dataBase64: z.string().min(16).max(maxImageBase64Length),
});

export const reviewSourceImageSchema = z.object({
  storagePath: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  originalName: z.string().min(1).max(180),
  uploadedAt: z.string().min(1),
});

export const reviewRequestSchema = z.object({
  category: z.enum(reviewCategories),
  mode: z.enum(feedbackModes),
  file: reviewFileSchema,
  brief: reviewBriefSchema,
  image: reviewImageSchema.optional(),
});

export const reviewIssueSchema = z.object({
  id: z.string().min(1).optional(),
  category: z.string(),
  score: z.number().min(0).max(10),
  priority: z.enum(["high", "medium", "low"]),
  observation: z.string(),
  impact: z.string(),
  recommendation: z.string(),
  actions: z.array(z.string()).min(1),
});

export const reviewAnnotationSchema = z.object({
  id: z.string().min(1),
  issueId: z.string().min(1),
  label: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.02).max(1),
  height: z.number().min(0.02).max(1),
  confidence: z.number().min(0).max(1),
});

export const reviewOutputSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  overallScore: z.number().min(0).max(10),
  summary: z.string(),
  strengths: z.array(z.string()).min(1),
  scores: z.array(z.object({ label: z.string(), score: z.number().min(0).max(10) })),
  rubricVersion: z.string().min(1).default("legacy"),
  issues: z.array(reviewIssueSchema).min(1),
  annotations: z.array(reviewAnnotationSchema).default([]),
  checklist: z.array(z.object({ label: z.string(), priority: z.enum(["high", "medium", "low"]) })),
  followUps: z.array(z.string()),
  provider: z.enum(["demo", "live"]),
});

export const reviewCreateResponseSchema = z.object({
  review: reviewOutputSchema,
  persistence: z.object({
    savedToAccount: z.boolean(),
    imageSavedToAccount: z.boolean().default(false),
    sourceImage: reviewSourceImageSchema.optional(),
  }),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
export type ReviewCreateResponse = z.infer<typeof reviewCreateResponseSchema>;
export type ReviewSourceImage = z.infer<typeof reviewSourceImageSchema>;

export const categoryLabels: Record<ReviewCategory, string> = {
  logo: "Logo",
  poster: "Poster",
  social: "Social media",
  ui: "UI/UX screen",
  website: "Website",
  "book-cover": "Book cover",
  packaging: "Packaging",
  other: "Other",
};
