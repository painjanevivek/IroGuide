import { z } from "zod";

const positiveBudgetSchema = z.number().positive().finite().nullable();

export const activationDecisionSchema = z.strictObject({
  observedRepeatValue: z.boolean(),
  providerEvaluationPassed: z.boolean(),
  providerBudgetApproved: z.boolean(),
  legalReviewPassed: z.boolean(),
  supportOwnerAssigned: z.boolean(),
  durableJobsVerified: z.boolean(),
  directUploadVerified: z.boolean(),
  deletionRecoveryVerified: z.boolean(),
  costLimits: z.strictObject({
    maxCostPerCompletedReviewUsd: positiveBudgetSchema,
    dailySpendCapUsd: positiveBudgetSchema,
    monthlySpendCapUsd: positiveBudgetSchema,
  }),
  rollback: z.strictObject({
    providerKillSwitchTested: z.boolean(),
    freeProfileRollbackTested: z.boolean(),
  }),
  monetization: z.strictObject({
    pricingValidated: z.boolean(),
    providerSelected: z.boolean(),
    entitlementSpecificationApproved: z.boolean(),
    webhookRecoveryDesigned: z.boolean(),
    taxAndCancellationReviewed: z.boolean(),
  }),
});

export function evaluateActivationDecision(input: unknown) {
  const decision = activationDecisionSchema.parse(input);
  const providerMissing = [
    ["observedRepeatValue", decision.observedRepeatValue],
    ["providerEvaluationPassed", decision.providerEvaluationPassed],
    ["providerBudgetApproved", decision.providerBudgetApproved],
    ["legalReviewPassed", decision.legalReviewPassed],
    ["supportOwnerAssigned", decision.supportOwnerAssigned],
    ["durableJobsVerified", decision.durableJobsVerified],
    ["directUploadVerified", decision.directUploadVerified],
    ["deletionRecoveryVerified", decision.deletionRecoveryVerified],
    ["providerKillSwitchTested", decision.rollback.providerKillSwitchTested],
    ["freeProfileRollbackTested", decision.rollback.freeProfileRollbackTested],
    ["maxCostPerCompletedReviewUsd", decision.costLimits.maxCostPerCompletedReviewUsd !== null],
    ["dailySpendCapUsd", decision.costLimits.dailySpendCapUsd !== null],
    ["monthlySpendCapUsd", decision.costLimits.monthlySpendCapUsd !== null],
  ] as const;
  const providerBlockers = providerMissing.filter(([, passed]) => !passed).map(([name]) => name);
  const providerActivation = providerBlockers.length === 0 ? "go" : "no-go";

  const monetizationMissing = Object.entries(decision.monetization)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  if (providerActivation === "no-go") monetizationMissing.unshift("providerActivation");

  return {
    providerActivation,
    providerBlockers,
    monetizationActivation: monetizationMissing.length === 0 ? "go" : "no-go",
    monetizationBlockers: monetizationMissing,
  } as const;
}
