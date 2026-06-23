import { z } from "zod";
import { categoryLabels, reviewCategories, reviewOutputSchema, reviewSourceImageSchema, type ReviewCategory, type ReviewOutput, type ReviewSourceImage } from "./review";

export const reviewSyncStateSchema = z.enum(["local", "cloud"]);

export const storedReviewDocumentSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  review: reviewOutputSchema,
  category: z.enum(reviewCategories),
  categoryLabel: z.string().min(1),
  provider: reviewOutputSchema.shape.provider,
  status: z.literal("complete"),
  savedAt: z.string().min(1),
  updatedAt: z.string().min(1),
  syncState: reviewSyncStateSchema,
  sourceImage: reviewSourceImageSchema.optional(),
});

export const reviewSyncResponseSchema = z.object({
  savedIds: z.array(z.string()),
  failedIds: z.array(z.string()),
  sourceImages: z.array(z.object({
    id: z.string().min(1),
    sourceImage: reviewSourceImageSchema,
  })).default([]),
});

export type StoredReviewDocument = z.infer<typeof storedReviewDocumentSchema>;
export type ReviewSyncResponse = z.infer<typeof reviewSyncResponseSchema>;

export function getReviewDocumentId(userId: string, reviewId: string) {
  return `${sanitizeDocumentId(userId)}_${sanitizeDocumentId(reviewId)}`;
}

export function createStoredReviewDocument({
  category,
  review,
  savedAt = new Date().toISOString(),
  sourceImage,
  syncState = "local",
  userId,
}: {
  category: ReviewCategory;
  review: ReviewOutput;
  savedAt?: string;
  sourceImage?: ReviewSourceImage;
  syncState?: StoredReviewDocument["syncState"];
  userId: string;
}): StoredReviewDocument {
  return {
    id: getReviewDocumentId(userId, review.id),
    userId,
    review,
    category,
    categoryLabel: categoryLabels[category],
    provider: review.provider,
    status: "complete",
    savedAt,
    updatedAt: savedAt,
    syncState,
    ...(sourceImage ? { sourceImage } : {}),
  };
}

function sanitizeDocumentId(value: string) {
  return value.trim().replaceAll("/", "_").replace(/[^\w.-]/g, "_").slice(0, 320) || "review";
}
