import { z } from "zod";

export const comparisonContractVersion = 1 as const;
export const comparisonMatchConfidenceThreshold = 0.65;

export const liveComparisonRequestSchema = z.strictObject({
  schemaVersion: z.literal(comparisonContractVersion),
  originalReviewDocumentId: z.string().min(1).max(700),
  revisedUploadId: z.string().min(1).max(200),
  idempotencyKey: z.string().min(16).max(128),
});

export const comparisonIssueOutcomeSchema = z.enum([
  "improved",
  "remaining",
  "regressed",
  "unmatched",
  "low-confidence",
]);

export const comparisonIssueMatchSchema = z.strictObject({
  originalIssueId: z.string().min(1).max(200).nullable(),
  revisedIssueId: z.string().min(1).max(200).nullable(),
  outcome: comparisonIssueOutcomeSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().min(1).max(500)).max(5),
}).superRefine((match, context) => {
  if (match.outcome !== "low-confidence" && match.evidence.length === 0) {
    context.addIssue({ code: "custom", message: "A comparison outcome requires observed evidence.", path: ["evidence"] });
  }
  if (match.outcome === "low-confidence" && match.confidence >= comparisonMatchConfidenceThreshold) {
    context.addIssue({ code: "custom", message: "Low-confidence outcomes must remain below the match threshold.", path: ["confidence"] });
  }
  if (match.outcome !== "low-confidence" && match.confidence < comparisonMatchConfidenceThreshold) {
    context.addIssue({ code: "custom", message: "Confident outcomes must meet the match threshold.", path: ["confidence"] });
  }
});

export const liveComparisonOutputSchema = z.strictObject({
  schemaVersion: z.literal(comparisonContractVersion),
  originalReviewDocumentId: z.string().min(1).max(700),
  comparisonId: z.string().min(1).max(200),
  compatibility: z.strictObject({
    category: z.string().min(1).max(80),
    provider: z.string().min(1).max(80),
    rubricVersion: z.string().min(1).max(80),
    scoreDimensions: z.array(z.string().min(1).max(80)).min(1).max(12),
  }),
  issueMatches: z.array(comparisonIssueMatchSchema).max(50),
  scoreDelta: z.number().min(-10).max(10).nullable(),
  scoreDeltaEligible: z.boolean(),
});

export function classifyComparisonIssue({
  confidence,
  originalIssueId,
  originalScore,
  revisedIssueId,
  revisedScore,
}: {
  confidence: number;
  originalIssueId: string | null;
  originalScore: number | null;
  revisedIssueId: string | null;
  revisedScore: number | null;
}): z.infer<typeof comparisonIssueOutcomeSchema> {
  if (confidence < comparisonMatchConfidenceThreshold) return "low-confidence";
  if (!originalIssueId || !revisedIssueId || originalScore === null || revisedScore === null) return "unmatched";
  const delta = revisedScore - originalScore;
  if (delta >= 0.75) return "improved";
  if (delta <= -0.75) return "regressed";
  return "remaining";
}

export type LiveComparisonRequest = z.infer<typeof liveComparisonRequestSchema>;
export type LiveComparisonOutput = z.infer<typeof liveComparisonOutputSchema>;
