import { z } from "zod";
import { categoryLabels, reviewCategories, reviewOutputSchema, reviewSourceImageSchema, type ReviewCategory, type ReviewOutput, type ReviewSourceImage } from "./review";

export const reviewSyncStateSchema = z.enum(["local", "cloud"]);

export const trustedReviewProvenanceSchema = z.strictObject({
  origin: z.literal("server"),
  schemaVersion: z.literal(1),
  generatedAt: z.iso.datetime({ offset: true }),
});

export const reviewTrustStateSchema = z.enum(["server-verified", "legacy-unverified"]);

const importedReviewOutputSchema = reviewOutputSchema
  .extend({ provider: z.literal("demo") })
  .strict();

export const importedReviewDocumentSchema = z.strictObject({
  id: z.string().min(1).max(700),
  userId: z.string().min(1).max(128),
  origin: z.literal("imported"),
  status: z.literal("imported"),
  review: importedReviewOutputSchema,
  category: z.enum(reviewCategories),
  categoryLabel: z.string().min(1).max(80),
  projectId: z.string().uuid().nullable().default(null),
  savedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  syncState: reviewSyncStateSchema,
});

export const storedReviewDocumentSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  review: reviewOutputSchema,
  category: z.enum(reviewCategories),
  categoryLabel: z.string().min(1),
  projectId: z.string().uuid().nullable().default(null),
  provider: reviewOutputSchema.shape.provider,
  status: z.literal("complete"),
  savedAt: z.string().min(1),
  updatedAt: z.string().min(1),
  syncState: reviewSyncStateSchema,
  sourceImage: reviewSourceImageSchema.optional(),
  provenance: trustedReviewProvenanceSchema.optional(),
});

export const trustedStoredReviewDocumentSchema = storedReviewDocumentSchema
  .extend({ provenance: trustedReviewProvenanceSchema })
  .refine((document) => document.provider === document.review.provider, {
    message: "Stored provider must match the normalized review provider.",
    path: ["provider"],
  });

const trustedReviewEvidenceSchema = z.object({
  status: z.literal("complete"),
  provider: reviewOutputSchema.shape.provider,
  review: reviewOutputSchema,
  provenance: trustedReviewProvenanceSchema,
}).refine((document) => document.provider === document.review.provider, {
  message: "Stored provider must match the normalized review provider.",
  path: ["provider"],
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
export type TrustedReviewProvenance = z.infer<typeof trustedReviewProvenanceSchema>;
export type TrustedStoredReviewDocument = z.infer<typeof trustedStoredReviewDocumentSchema>;
export type ReviewTrustState = z.infer<typeof reviewTrustStateSchema>;
export type ImportedReviewDocument = z.infer<typeof importedReviewDocumentSchema>;
export type ReviewSyncResponse = z.infer<typeof reviewSyncResponseSchema>;

export function isTrustedReviewDocument(value: unknown): value is TrustedStoredReviewDocument {
  return trustedStoredReviewDocumentSchema.safeParse(value).success;
}

export function getReviewTrustState(value: unknown): ReviewTrustState {
  return trustedReviewEvidenceSchema.safeParse(value).success
    ? "server-verified"
    : "legacy-unverified";
}

export function createImportedReviewDocument({
  category,
  projectId = null,
  review,
  savedAt = new Date().toISOString(),
  syncState = "local",
  userId,
}: {
  category: ReviewCategory;
  projectId?: string | null;
  review: ReviewOutput;
  savedAt?: string;
  syncState?: ImportedReviewDocument["syncState"];
  userId: string;
}): ImportedReviewDocument {
  return importedReviewDocumentSchema.parse({
    id: getReviewDocumentId(userId, review.id),
    userId,
    origin: "imported",
    status: "imported",
    review,
    category,
    categoryLabel: categoryLabels[category],
    projectId,
    savedAt,
    updatedAt: savedAt,
    syncState,
  });
}

export function getReviewDocumentId(userId: string, reviewId: string) {
  return `${sanitizeDocumentId(userId)}_${sanitizeDocumentId(reviewId)}`;
}

export function createStoredReviewDocument({
  category,
  projectId = null,
  review,
  savedAt = new Date().toISOString(),
  sourceImage,
  syncState = "local",
  userId,
}: {
  category: ReviewCategory;
  projectId?: string | null;
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
    projectId,
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
