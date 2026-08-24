import { createHash } from "node:crypto";

export function buildProviderEvaluationArtifacts(input) {
  if (!input || input.schemaVersion !== 1 || !Array.isArray(input.results) || input.results.length === 0) {
    throw new Error("Evaluation input must contain at least one schema-version 1 result.");
  }
  const results = input.results.map(validateResult).sort(compareResult);
  const candidates = [...new Set(results.map((result) => `${result.provider}\0${result.model}`))].sort();
  const candidateCodes = new Map(candidates.map((candidate, index) => [candidate, `candidate-${String(index + 1).padStart(2, "0")}`]));
  const normalized = results.map((result) => ({
    ...result,
    candidateCode: candidateCodes.get(`${result.provider}\0${result.model}`),
    outputHash: hashCanonical(result.output),
  }));
  const blindReviewSheet = {
    schemaVersion: 1,
    runLabel: input.runLabel,
    entries: normalized.map((result) => ({
      candidateCode: result.candidateCode,
      scenarioId: result.scenarioId,
      repetition: result.repetition,
      outputHash: result.outputHash,
      output: result.output,
    })),
  };
  const completed = normalized.filter((result) => result.status === "completed");
  const knownCosts = completed.map((result) => result.costUsd).filter((value) => value !== null);
  const latencies = completed.map((result) => result.latencyMs).sort((left, right) => left - right);
  const summaryCore = {
    schemaVersion: 1,
    runLabel: input.runLabel,
    resultCount: normalized.length,
    completedCount: completed.length,
    invalidCount: normalized.filter((result) => result.status === "invalid-output").length,
    failedCount: normalized.filter((result) => result.status === "failed").length,
    costCoverageComplete: knownCosts.length === completed.length,
    totalCostUsd: roundMoney(knownCosts.reduce((sum, value) => sum + value, 0)),
    maxCompletedCostUsd: knownCosts.length === 0 ? null : roundMoney(Math.max(...knownCosts)),
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    results: normalized.map((result) => Object.fromEntries(Object.entries(result).filter(([key]) => key !== "output"))),
  };
  return {
    blindReviewSheet,
    summary: { ...summaryCore, resultHash: hashCanonical(summaryCore) },
  };
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashCanonical(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function validateResult(result, index) {
  if (!result || typeof result !== "object") throw new Error(`Result ${index} must be an object.`);
  for (const key of ["scenarioId", "provider", "model", "status"]) {
    if (typeof result[key] !== "string" || !result[key].trim()) throw new Error(`Result ${index} requires ${key}.`);
  }
  if (!["completed", "invalid-output", "failed"].includes(result.status)) throw new Error(`Result ${index} has an invalid status.`);
  if (!Number.isInteger(result.repetition) || result.repetition < 1 || result.repetition > 20) throw new Error(`Result ${index} has an invalid repetition.`);
  if (!Number.isInteger(result.latencyMs) || result.latencyMs < 0 || result.latencyMs > 300_000) throw new Error(`Result ${index} has an invalid latency.`);
  if (result.costUsd !== null && (typeof result.costUsd !== "number" || !Number.isFinite(result.costUsd) || result.costUsd < 0 || result.costUsd > 100)) {
    throw new Error(`Result ${index} has an invalid cost.`);
  }
  if (result.output === undefined) throw new Error(`Result ${index} requires an output value, including null for failed calls.`);
  return {
    scenarioId: result.scenarioId.trim(),
    provider: result.provider.trim(),
    model: result.model.trim(),
    repetition: result.repetition,
    latencyMs: result.latencyMs,
    costUsd: result.costUsd,
    status: result.status,
    output: result.output,
  };
}

function compareResult(left, right) {
  return left.scenarioId.localeCompare(right.scenarioId)
    || left.repetition - right.repetition
    || left.provider.localeCompare(right.provider)
    || left.model.localeCompare(right.model);
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  return values[Math.max(0, Math.ceil(values.length * fraction) - 1)];
}

function roundMoney(value) {
  return Number(value.toFixed(6));
}
