import { describe, expect, it } from "vitest";
import incompleteProviderOutput from "../../fixtures/provider-evaluation/incomplete-provider-output.json";
import { reviewOutputSchema } from "./review";
import { summarizeProviderEvaluation } from "./provider-evaluation";

const passingRating = {
  scenarioId: "website-hierarchy",
  reviewerId: "reviewer-a",
  scores: {
    schemaValidity: 2,
    evidenceGrounding: 2,
    rubricFit: 2,
    prioritization: 2,
    actionability: 1,
    uncertaintyHandling: 1,
  },
  blockingFailure: "none" as const,
  notes: "All findings point to visible evidence.",
};

describe("provider-independent evaluation scoring", () => {
  it("passes a grounded candidate at the documented quality threshold", () => {
    expect(summarizeProviderEvaluation(passingRating)).toEqual({ maximum: 12, passed: true, total: 10 });
  });

  it("blocks invented evidence regardless of aggregate score", () => {
    expect(summarizeProviderEvaluation({ ...passingRating, blockingFailure: "invented-evidence" }).passed).toBe(false);
  });

  it("requires full evidence-grounding credit", () => {
    expect(summarizeProviderEvaluation({ ...passingRating, scores: { ...passingRating.scores, evidenceGrounding: 1, actionability: 2 } }).passed).toBe(false);
  });

  it("keeps the incomplete provider fixture invalid instead of repairing evidence", () => {
    expect(reviewOutputSchema.safeParse(incompleteProviderOutput).success).toBe(false);
  });
});
