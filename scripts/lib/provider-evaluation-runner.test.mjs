import { describe, expect, it } from "vitest";
import { buildProviderEvaluationArtifacts, hashCanonical } from "./provider-evaluation-runner.mjs";

const input = {
  schemaVersion: 1,
  runLabel: "offline-fixture",
  results: [
    { scenarioId: "case-b", provider: "provider-z", model: "model-2", repetition: 1, latencyMs: 1200, costUsd: 0.02, status: "completed", output: { summary: "B" } },
    { scenarioId: "case-a", provider: "provider-a", model: "model-1", repetition: 1, latencyMs: 600, costUsd: 0.01, status: "completed", output: { summary: "A" } },
  ],
};

describe("provider evaluation artifact runner", () => {
  it("creates deterministic hashes and stable candidate blinding", () => {
    const first = buildProviderEvaluationArtifacts(input);
    const second = buildProviderEvaluationArtifacts({ ...input, results: [...input.results].reverse() });
    expect(second).toEqual(first);
    expect(first.summary).toMatchObject({ completedCount: 2, costCoverageComplete: true, totalCostUsd: 0.03, p50LatencyMs: 600, p95LatencyMs: 1200 });
    expect(first.blindReviewSheet.entries.map((entry) => entry.candidateCode)).toEqual(["candidate-01", "candidate-02"]);
    expect(JSON.stringify(first.blindReviewSheet)).not.toContain("provider-a");
  });

  it("hashes object keys canonically", () => {
    expect(hashCanonical({ b: 2, a: 1 })).toBe(hashCanonical({ a: 1, b: 2 }));
  });

  it("fails closed when latency or cost evidence is malformed", () => {
    expect(() => buildProviderEvaluationArtifacts({ ...input, results: [{ ...input.results[0], costUsd: -1 }] })).toThrow(/invalid cost/i);
    expect(() => buildProviderEvaluationArtifacts({ ...input, results: [{ ...input.results[0], latencyMs: Number.NaN }] })).toThrow(/invalid latency/i);
  });
});
