import { describe, expect, it } from "vitest";
import { evaluateActivationDecision } from "./activation-decision";

const approved = {
  observedRepeatValue: true,
  providerEvaluationPassed: true,
  providerBudgetApproved: true,
  legalReviewPassed: true,
  supportOwnerAssigned: true,
  durableJobsVerified: true,
  directUploadVerified: true,
  deletionRecoveryVerified: true,
  costLimits: { maxCostPerCompletedReviewUsd: 0.25, dailySpendCapUsd: 25, monthlySpendCapUsd: 500 },
  rollback: { providerKillSwitchTested: true, freeProfileRollbackTested: true },
  monetization: {
    pricingValidated: true,
    providerSelected: true,
    entitlementSpecificationApproved: true,
    webhookRecoveryDesigned: true,
    taxAndCancellationReviewed: true,
  },
};

describe("provider and monetization activation decision", () => {
  it("requires explicit cost caps and rollback evidence for provider activation", () => {
    const result = evaluateActivationDecision({
      ...approved,
      providerBudgetApproved: false,
      costLimits: { maxCostPerCompletedReviewUsd: null, dailySpendCapUsd: null, monthlySpendCapUsd: null },
    });
    expect(result.providerActivation).toBe("no-go");
    expect(result.providerBlockers).toEqual(expect.arrayContaining(["providerBudgetApproved", "dailySpendCapUsd", "monthlySpendCapUsd"]));
  });

  it("does not allow monetization before provider value is approved", () => {
    const result = evaluateActivationDecision({ ...approved, observedRepeatValue: false });
    expect(result.providerActivation).toBe("no-go");
    expect(result.monetizationActivation).toBe("no-go");
    expect(result.monetizationBlockers).toContain("providerActivation");
  });

  it("returns go only when every independent approval is evidenced", () => {
    expect(evaluateActivationDecision(approved)).toMatchObject({ providerActivation: "go", monetizationActivation: "go" });
  });
});
