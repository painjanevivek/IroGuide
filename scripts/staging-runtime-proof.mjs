import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const actions = ["admin-readiness", "account-journey", "storage-boundary", "token-revocation"];

async function main() {
  const baseUrl = normalizeBaseUrl(requiredEnv("SMOKE_BASE_URL"));
  const hostname = new URL(baseUrl).hostname.toLowerCase();
  if (!hostname.includes("staging") && !hostname.endsWith(".vercel.app")) throw new Error("The runtime proof requires a staging or immutable preview host.");
  if (["iroguide.com", "www.iroguide.com", "iro-guide.vercel.app"].includes(hostname)) throw new Error("The runtime proof is blocked on production aliases.");
  const proofSecret = requiredEnv("IROGUIDE_STAGING_PROOF_SECRET");
  const deploymentProtectionBypass = process.env.SMOKE_DEPLOYMENT_PROTECTION_BYPASS?.trim();
  const results = [];

  for (const action of actions) {
    const response = await fetch(`${baseUrl}/api/internal/staging-release-proof`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: new URL(baseUrl).origin,
        "x-iroguide-staging-proof-secret": proofSecret,
        ...(deploymentProtectionBypass ? { "x-vercel-protection-bypass": deploymentProtectionBypass } : {}),
      },
      body: JSON.stringify({ action }),
    });
    const payload = await response.json().catch(() => null);
    const evaluated = evaluateRuntimeProofResponse(action, response.status, payload);
    results.push(evaluated);
    console.log(`${evaluated.ok ? "PASS" : "FAIL"} ${action} - status=${response.status} checks=${evaluated.checkCount}`);
  }

  const report = { baseUrl, checkedAt: new Date().toISOString(), results };
  const fullPath = resolve(process.env.STAGING_RUNTIME_PROOF_REPORT_PATH ?? "artifacts/staging-runtime-proof.json");
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Staging runtime proof report: ${fullPath}`);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

export function evaluateRuntimeProofResponse(action, status, payload) {
  const forbiddenKeys = ["apiKey", "authorization", "customToken", "email", "idToken", "password", "privateKey", "secret", "token", "uid", "userId"];
  const exposed = findForbiddenKeys(payload, forbiddenKeys);
  const proofResults = Array.isArray(payload?.results) ? payload.results : [];
  const ok = status === 200 && payload?.ok === true && proofResults.length > 0 && proofResults.every((item) => item?.ok === true) && exposed.length === 0;
  return { action, status, ok, checkCount: proofResults.length, exposedKeys: exposed, results: proofResults };
}

function findForbiddenKeys(value, forbiddenKeys, path = []) {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (forbiddenKeys.some((forbidden) => forbidden.toLowerCase() === key.toLowerCase())) findings.push(nextPath.join("."));
    findings.push(...findForbiddenKeys(child, forbiddenKeys, nextPath));
  }
  return findings;
}

function normalizeBaseUrl(value) { return value.trim().replace(/\/+$/, ""); }
function requiredEnv(name) { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required.`); return value; }

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
