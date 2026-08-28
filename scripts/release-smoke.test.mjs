import { describe, expect, it } from "vitest";
import { getPrivilegedReadinessFailures } from "./privileged-readiness-smoke.mjs";
import { evaluatePerformanceSample } from "./performance-budget.mjs";
import { assertNonProductionTarget } from "./staging-account-journey.mjs";
import { assertStorageMutationApproval } from "./storage-boundary-smoke.mjs";

describe("release smoke safety", () => {
  it("blocks account mutation without explicit approval or on production aliases", () => {
    expect(() => assertNonProductionTarget("https://iro-guide-staging.example.vercel.app", "false")).toThrow(/SMOKE_ALLOW_ACCOUNT_MUTATION/);
    expect(() => assertNonProductionTarget("https://iroguide.com", "true")).toThrow(/blocked on production/i);
    expect(() => assertNonProductionTarget("https://example.com", "true")).toThrow(/staging or immutable preview/i);
    expect(() => assertNonProductionTarget("https://iro-guide-staging.example.vercel.app", "true")).not.toThrow();
  });

  it("requires a green free profile while keeping external capabilities closed", () => {
    const payload = {
      ok: true,
      capabilities: { profile: "free", guidedLearning: true, aiCritique: false, bugReportEmail: false, community: false, sourceImageStorage: false },
      checks: { accountStorage: true, clientIdentity: true, firebaseProjectMatch: true, productEvidence: true, providerControls: true, rateLimitAdapter: true, requestBudgets: true, reviewPipeline: true },
      operations: { communityGate: "closed" },
    };
    expect(getPrivilegedReadinessFailures(200, payload)).toEqual([]);
    expect(getPrivilegedReadinessFailures(200, { ...payload, capabilities: { ...payload.capabilities, aiCritique: true } })).toContain("aiCritique must remain disabled");
  });

  it("requires explicit staging approval before mutating the real Storage boundary", () => {
    expect(() => assertStorageMutationApproval("false", "staging")).toThrow(/SMOKE_ALLOW_STORAGE_MUTATION/);
    expect(() => assertStorageMutationApproval("true", "production")).toThrow(/staging/i);
    expect(() => assertStorageMutationApproval("true", "staging")).not.toThrow();
  });

  it("fails a route when a Core Web Vital or transfer budget regresses", () => {
    const budget = { cls: 0.1, lcpMs: 3_000, scriptBytes: 900_000, totalBytes: 2_500_000 };
    expect(evaluatePerformanceSample("/", { cls: 0.02, lcpMs: 1_800, scriptBytes: 300_000, totalBytes: 800_000 }, budget).ok).toBe(true);
    expect(evaluatePerformanceSample("/", { cls: 0.2, lcpMs: 3_500, scriptBytes: 1_000_000, totalBytes: 3_000_000 }, budget).failures).toHaveLength(4);
  });
});
