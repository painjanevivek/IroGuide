import { describe, expect, it } from "vitest";
import { productCapabilityNames, type LaunchCapabilities } from "@/domain/launch-capabilities";
import { buildReadiness } from "./readiness";

const freeCapabilities: LaunchCapabilities = {
  profile: "free",
  ...Object.fromEntries(productCapabilityNames.map((capability) => [capability, false])) as Record<(typeof productCapabilityNames)[number], boolean>,
};

const fullCapabilities: LaunchCapabilities = {
  ...freeCapabilities,
  profile: "full",
  liveCritique: true,
  bugReportEmail: true,
  guidedLearning: true,
  sourceImageStorage: true,
};

const healthyChecks = {
  accountStorage: true,
  bugReportEmail: true,
  clientIdentity: true,
  firebaseProjectMatch: true,
  liveVision: true,
  productEvidence: true,
  providerControls: true,
  reviewPipeline: true,
  rateLimitAdapter: true,
  requestBudgets: true,
  sourceImageStorage: true,
};

describe("readiness contract", () => {
  it("treats disabled optional services as healthy free-launch behavior", () => {
    expect(buildReadiness({
      capabilities: freeCapabilities,
      checks: {
        ...healthyChecks,
        bugReportEmail: false,
        liveVision: false,
        sourceImageStorage: false,
      },
    })).toMatchObject({ ok: true, capabilities: freeCapabilities });
  });

  it.each(["accountStorage", "clientIdentity", "firebaseProjectMatch", "productEvidence", "providerControls", "reviewPipeline", "rateLimitAdapter", "requestBudgets"] as const)("requires core check %s in free mode", (check) => {
    const result = buildReadiness({
      capabilities: freeCapabilities,
      checks: {
        ...healthyChecks,
        [check]: false,
        bugReportEmail: false,
        liveVision: false,
        sourceImageStorage: false,
      },
    });

    expect(result.ok).toBe(false);
  });

  it("requires every enabled optional service in full mode", () => {
    expect(buildReadiness({ capabilities: fullCapabilities, checks: healthyChecks }).ok).toBe(true);

    for (const check of ["bugReportEmail", "liveVision", "sourceImageStorage"] as const) {
      expect(buildReadiness({
        capabilities: fullCapabilities,
        checks: { ...healthyChecks, [check]: false },
      }).ok).toBe(false);
    }
  });
});
