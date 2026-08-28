import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { deleteApp, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import nextEnv from "@next/env";
import { getServiceAccount, normalizeBaseUrl } from "./production-smoke.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const reportPath = process.env.ADMIN_READINESS_REPORT_PATH ?? "artifacts/privileged-readiness.json";

async function main() {
  const baseUrl = normalizeBaseUrl(requiredEnv("SMOKE_BASE_URL"));
  const apiKey = requiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const adminUserId = requiredEnv("SMOKE_ADMIN_UID", firstCsvValue(process.env.IROGUIDE_ADMIN_UIDS));
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) throw new Error("Firebase Admin credentials are required for privileged readiness.");

  const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId }, `iroguide-admin-readiness-${Date.now()}`);
  const auth = getAuth(app);
  try {
    await auth.getUser(adminUserId);
    const customToken = await auth.createCustomToken(adminUserId);
    const idToken = await exchangeCustomToken(apiKey, customToken);
    const response = await fetch(`${baseUrl}/api/admin/readiness`, { headers: { Authorization: `Bearer ${idToken}`, Origin: new URL(baseUrl).origin } });
    const payload = await response.json();
    const failures = getPrivilegedReadinessFailures(response.status, payload);
    const report = {
      baseUrl,
      checkedAt: new Date().toISOString(),
      ok: failures.length === 0,
      failures,
      summary: summarizeReadiness(payload),
    };
    await writeReport(report);
    console.log(`Privileged readiness summary: ${failures.length === 0 ? "PASS" : "FAIL"}`);
    console.log(`Privileged readiness report: ${resolve(reportPath)}`);
    if (failures.length > 0) throw new Error(failures.join("; "));
  } finally {
    await deleteApp(app);
  }
}

export function getPrivilegedReadinessFailures(status, payload) {
  if (!payload || typeof payload !== "object") return ["readiness response is not an object"];
  const failures = [];
  if (status !== 200) failures.push(`status=${status}`);
  if (payload.ok !== true) failures.push("readiness is not green");
  if (payload.capabilities?.profile !== "free") failures.push("launch profile is not free");
  if (payload.capabilities?.guidedLearning !== true) failures.push("guided learning is not enabled");
  for (const key of ["aiCritique", "bugReportEmail", "community", "sourceImageStorage"]) {
    if (payload.capabilities?.[key] !== false) failures.push(`${key} must remain disabled`);
  }
  for (const key of ["accountStorage", "clientIdentity", "firebaseProjectMatch", "productEvidence", "providerControls", "rateLimitAdapter", "requestBudgets", "reviewPipeline"]) {
    if (payload.checks?.[key] !== true) failures.push(`${key} is not ready`);
  }
  if (payload.operations?.communityGate !== "closed") failures.push("Community gate is not closed");
  return failures;
}

function summarizeReadiness(payload) {
  return {
    profile: payload?.capabilities?.profile ?? "unknown",
    guidedLearning: payload?.capabilities?.guidedLearning === true,
    gatedCapabilitiesClosed: ["aiCritique", "bugReportEmail", "community", "sourceImageStorage"].every((key) => payload?.capabilities?.[key] === false),
    coreChecksReady: ["accountStorage", "clientIdentity", "firebaseProjectMatch", "productEvidence", "providerControls", "rateLimitAdapter", "requestBudgets", "reviewPipeline"].every((key) => payload?.checks?.[key] === true),
    communityGate: payload?.operations?.communityGate ?? "unknown",
  };
}

async function exchangeCustomToken(apiKey, customToken) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const payload = await response.json();
  if (!response.ok || typeof payload.idToken !== "string") throw new Error(`Admin token exchange failed with status ${response.status}.`);
  return payload.idToken;
}

function firstCsvValue(value) { return value?.split(",").map((item) => item.trim()).find(Boolean) ?? ""; }
function requiredEnv(name, fallback = "") { const value = process.env[name]?.trim() || fallback; if (!value) throw new Error(`${name} is required.`); return value; }
async function writeReport(report) { const fullPath = resolve(reportPath); await mkdir(dirname(fullPath), { recursive: true }); await writeFile(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"); }

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
