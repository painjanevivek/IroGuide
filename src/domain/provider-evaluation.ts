import { z } from "zod";

export const providerEvaluationDimensions = [
  "schemaValidity",
  "evidenceGrounding",
  "rubricFit",
  "prioritization",
  "actionability",
  "uncertaintyHandling",
] as const;

const dimensionScoreSchema = z.number().int().min(0).max(2);

export const providerEvaluationRatingSchema = z.strictObject({
  scenarioId: z.string().min(1).max(100),
  reviewerId: z.string().min(1).max(100),
  scores: z.strictObject(Object.fromEntries(
    providerEvaluationDimensions.map((dimension) => [dimension, dimensionScoreSchema]),
  ) as Record<(typeof providerEvaluationDimensions)[number], typeof dimensionScoreSchema>),
  blockingFailure: z.enum(["none", "invalid-schema", "invented-evidence", "privacy", "wrong-artifact"]),
  notes: z.string().max(2_000),
});

export const providerEvaluationScenarios = Object.freeze([
  { id: "website-hierarchy", category: "website", asset: "/samples/fieldnote-mentor.webp", emphasis: "hierarchy and conversion path" },
  { id: "poster-density", category: "poster", asset: "/samples/signal-noise-direct.webp", emphasis: "dense type and event logistics" },
  { id: "social-campaign", category: "social", asset: "/samples/form-together-friendly.webp", emphasis: "booking action and practical details" },
  { id: "low-evidence", category: "logo", asset: "/brand/iroguide-logo.png", emphasis: "uncertainty instead of invented detail" },
  { id: "incomplete-output", category: "website", asset: "fixtures/provider-evaluation/incomplete-provider-output.json", emphasis: "fail closed without repair fabrication" },
] as const);

export function summarizeProviderEvaluation(input: unknown) {
  const rating = providerEvaluationRatingSchema.parse(input);
  const total = providerEvaluationDimensions.reduce((sum, dimension) => sum + rating.scores[dimension], 0);
  const maximum = providerEvaluationDimensions.length * 2;
  return {
    maximum,
    passed: rating.blockingFailure === "none" && total >= 10 && rating.scores.evidenceGrounding === 2,
    total,
  } as const;
}
