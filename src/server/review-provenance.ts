import type { ReviewCategory, ReviewOutput } from "@/domain/review";
import {
  createStoredReviewDocument,
  trustedStoredReviewDocumentSchema,
  type TrustedStoredReviewDocument,
} from "@/domain/review-storage";

type TrustedReviewDocumentInput = {
  category: ReviewCategory;
  projectId?: string | null;
  review: ReviewOutput;
  savedAt?: string;
  userId: string;
};

type TrustedReviewDocumentDependencies = {
  now?: () => Date;
};

export function createTrustedReviewDocument(
  input: TrustedReviewDocumentInput,
  { now = () => new Date() }: TrustedReviewDocumentDependencies = {},
): TrustedStoredReviewDocument {
  const document = createStoredReviewDocument({
    ...input,
    syncState: "cloud",
  });

  return trustedStoredReviewDocumentSchema.parse({
    ...document,
    provenance: {
      origin: "server",
      schemaVersion: 1,
      generatedAt: now().toISOString(),
    },
  });
}
