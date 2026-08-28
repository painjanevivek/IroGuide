import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const expectedPublic = ["/", "/learn", "/auth/sign-in", "/contact", "/privacy"];

export function evaluateReadiness(payload) {
  const failures = [];
  if (payload?.ok !== true) failures.push("public readiness is not healthy");
  if (!payload?.capabilities) return failures;
  if (payload?.capabilities?.profile !== "free") failures.push("launch profile drifted from free");
  if (payload?.capabilities?.guidedLearning !== true) failures.push("guided learning is not enabled");
  for (const capability of ["aiCritique", "bugReportEmail", "community", "sourceImageStorage"]) {
    if (payload?.capabilities?.[capability] !== false) failures.push(`${capability} must remain disabled`);
  }
  if (payload?.operations?.communityGate !== "closed") failures.push("Community gate must remain closed");
  return failures;
}

export function evaluateProbeResults(results) {
  return results.filter((result) => !result.ok).map((result) => result.name);
}

async function main() {
  const baseUrl = normalize(process.env.OPERATIONS_BASE_URL ?? process.env.SMOKE_BASE_URL);
  const reportPath = resolve(process.env.OPERATIONS_REPORT_PATH ?? "artifacts/operations-probe.json");
  const bypass = process.env.SMOKE_DEPLOYMENT_PROTECTION_BYPASS?.trim();
  const requireReady = process.env.OPERATIONS_REQUIRE_READY !== "false";
  const headers = bypass ? { "x-vercel-protection-bypass": bypass } : {};
  const results = [];

  for (const path of expectedPublic) {
    const response = await request(baseUrl, path, { headers });
    results.push(result(`public ${path}`, response.status === 200, response.status));
  }

  const readinessResponse = await request(baseUrl, "/api/readiness", { headers });
  const readiness = await readinessResponse.json().catch(() => null);
  const readinessFailures = readinessResponse.status === 200 || (!requireReady && readinessResponse.status === 503)
    ? evaluateReadiness(readiness)
    : [`status ${readinessResponse.status}`];
  results.push({ name: "free capability contract", ok: readinessFailures.length === 0, detail: readinessFailures.join("; ") });

  const protectedChecks = [
    ["access interest auth boundary", "/api/access-interest", "POST", 401],
    ["account deletion auth boundary", "/api/account", "DELETE", 401],
    ["review pipeline remains closed", "/api/review-uploads", "POST", 404],
    ["Community API remains closed", "/api/community", "POST", 404],
  ];
  for (const [name, path, method, expected] of protectedChecks) {
    const response = await request(baseUrl, path, { method, headers: { ...headers, Origin: baseUrl, "Content-Type": "application/json" }, body: "{}" });
    results.push(result(name, response.status === expected, response.status));
  }

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ checkedAt: new Date().toISOString(), baseUrl, results }, null, 2)}\n`);
  for (const item of results) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
  console.log(`Operations probe report: ${reportPath}`);
  if (evaluateProbeResults(results).length > 0) process.exitCode = 1;
}

async function request(baseUrl, path, options = {}) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", signal: AbortSignal.timeout(12_000), ...options });
}

function result(name, ok, status) { return { name, ok, detail: `status=${status}` }; }
function normalize(value) { if (!value) throw new Error("OPERATIONS_BASE_URL is required."); return value.trim().replace(/\/+$/, ""); }

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
