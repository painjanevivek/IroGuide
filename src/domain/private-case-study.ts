import { z } from "zod";

export const privateCaseStudySchema = z.strictObject({
  schemaVersion: z.literal(1),
  ownerId: z.string().min(1).max(128),
  visibility: z.literal("private"),
  exportStatus: z.literal("disabled"),
  sourceReviewDocumentIds: z.array(z.string().min(1).max(700)).min(1).max(10),
  sourceComparisonIds: z.array(z.string().min(1).max(200)).max(5),
  title: z.string().min(1).max(120),
  context: z.string().min(1).max(1_000),
  decision: z.string().min(1).max(1_000),
  outcome: z.string().max(1_000).nullable(),
  claims: z.array(z.strictObject({
    text: z.string().min(1).max(500),
    sourceType: z.enum(["review", "comparison"]),
    sourceId: z.string().min(1).max(700),
  })).min(1).max(20),
});

type CaseStudyReviewEvidence = {
  categoryLabel?: string;
  documentId: string;
  issues: Array<{ recommendation: string }>;
  strengths: string[];
  summary: string;
  trustState: "server-verified" | "legacy-unverified";
  userId?: string;
};

export function createPrivateCaseStudyDraft(ownerId: string, review: CaseStudyReviewEvidence) {
  if (review.userId !== ownerId || review.trustState !== "server-verified") {
    throw new PrivateCaseStudyEvidenceError();
  }
  const decision = review.issues.find((issue) => issue.recommendation.trim())?.recommendation
    ?? "Select one verified critique recommendation before describing the design decision.";
  const claims = [review.summary, review.strengths[0], decision]
    .filter((claim): claim is string => Boolean(claim?.trim()))
    .map((text) => ({ text, sourceType: "review" as const, sourceId: review.documentId }));

  return privateCaseStudySchema.parse({
    schemaVersion: 1,
    ownerId,
    visibility: "private",
    exportStatus: "disabled",
    sourceReviewDocumentIds: [review.documentId],
    sourceComparisonIds: [],
    title: `${review.categoryLabel ?? "Design"} improvement evidence`,
    context: review.summary,
    decision,
    outcome: null,
    claims,
  });
}

export class PrivateCaseStudyEvidenceError extends Error {
  constructor() {
    super("Private case studies require an owned, server-verified review.");
    this.name = "PrivateCaseStudyEvidenceError";
  }
}

export type PrivateCaseStudy = z.infer<typeof privateCaseStudySchema>;
