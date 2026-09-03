import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { deleteApp, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import nextEnv from "@next/env";
import { getServiceAccount, normalizeBaseUrl } from "./production-smoke.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const reportPath = process.env.ACCOUNT_JOURNEY_REPORT_PATH ?? "artifacts/staging-account-journey.json";
const deploymentProtectionBypass = process.env.SMOKE_DEPLOYMENT_PROTECTION_BYPASS?.trim();
const results = [];

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? "");
  assertNonProductionTarget(baseUrl, process.env.SMOKE_ALLOW_ACCOUNT_MUTATION);
  const apiKey = requiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) throw new Error("Firebase Admin credentials are required for the staging account journey.");

  const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId }, `iroguide-account-journey-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const email = `activation-smoke-${Date.now()}-${randomBytes(4).toString("hex")}@iroguide.test`;
  const password = `IroGuide-${randomBytes(18).toString("base64url")}!`;
  let userId = "";

  try {
    const created = await identityRequest(apiKey, "signUp", { email, password, returnSecureToken: true });
    userId = requiredString(created.localId, "Firebase sign-up did not return an account ID.");
    addResult("create disposable account", true);
    if (parseJwtPayload(requiredString(created.idToken, "Firebase sign-up did not return an ID token.")).email_verified === true) {
      throw new Error("The disposable account unexpectedly started verified.");
    }
    addResult("new account starts unverified", true);

    await auth.updateUser(userId, { emailVerified: true });
    addResult("verify disposable account", true);

    const signedIn = await identityRequest(apiKey, "signInWithPassword", { email, password, returnSecureToken: true });
    const idToken = requiredString(signedIn.idToken, "Firebase sign-in did not return an ID token.");
    if (parseJwtPayload(idToken).email_verified !== true) throw new Error("Fresh sign-in did not carry the verified-email claim.");
    addResult("sign out and sign back in", true);
    addResult("fresh token carries verified-email claim", true);

    const initial = await apiRequest(baseUrl, "/api/account/experience", idToken);
    expectStatus(initial, 200, "load account experience");
    const initialPayload = await initial.json();
    const initialRevision = initialPayload?.experience?.revision;
    if (!Number.isInteger(initialRevision)) throw new Error("Account experience did not expose a bounded revision.");

    const updated = await apiRequest(baseUrl, "/api/account/experience", idToken, {
      method: "PATCH",
      body: {
        schemaVersion: 1,
        expectedRevision: initialRevision,
        mutationId: randomUUID(),
        action: "update",
        changes: {
          primaryRole: "freelancer",
          primaryGoal: "pre-client-check",
          preferredMode: "mentor",
          selectedCategories: ["website"],
          onboardingStatus: "in-progress",
          onboardingStep: 3,
        },
      },
    });
    expectStatus(updated, 200, "update account experience");

    const briefId = `staging-smoke-${randomUUID()}`;
    const savedBrief = await apiRequest(baseUrl, "/api/design-briefs", idToken, {
      method: "PUT",
      body: {
        schemaVersion: 1,
        id: briefId,
        expectedRevision: null,
        mutationId: randomUUID(),
        category: "website",
        audience: "Disposable staging test audience",
        purpose: "Verify owner-scoped activation persistence",
        style: "Editorial",
        goal: "Confirm staging save and deletion",
        concern: "Smoke test only",
        constraints: "No image or provider work",
        mode: "mentor",
        step: 4,
        flowVersion: "brief-v1",
        status: "ready",
      },
    });
    expectStatus(savedBrief, 200, "save design brief");

    const exported = await apiRequest(baseUrl, "/api/account/export", idToken, { method: "POST", body: { schemaVersion: 1 } });
    expectStatus(exported, 200, "export owned account data");
    const exportPayload = await exported.json();
    if (exportPayload?.schemaVersion !== 1 || !Array.isArray(exportPayload?.learning?.briefs) || exportPayload.learning.briefs.length !== 1) {
      throw new Error("Account export did not contain the single owned staging brief.");
    }

    const purgedReviews = await apiRequest(baseUrl, "/api/account/reviews", idToken, { method: "DELETE" });
    expectStatus(purgedReviews, 200, "purge review history");

    const clearedLearning = await apiRequest(baseUrl, "/api/account/experience", idToken, { method: "DELETE", body: { schemaVersion: 1, scope: "learning-history" } });
    expectStatus(clearedLearning, 200, "clear learning history");
    const remainingBriefs = await apiRequest(baseUrl, "/api/design-briefs", idToken);
    expectStatus(remainingBriefs, 200, "verify learning purge");
    if ((await remainingBriefs.json())?.records?.length !== 0) throw new Error("Learning purge left a disposable brief behind.");

    const deleted = await apiRequest(baseUrl, "/api/account", idToken, { method: "DELETE" });
    expectStatus(deleted, 200, "delete disposable account");
    const deletionPayload = await deleted.json();
    if (deletionPayload?.deleted !== true) throw new Error("Account deletion did not report a terminal result.");

    const staleTokenResponse = await apiRequest(baseUrl, "/api/account/experience", idToken);
    expectStatus(staleTokenResponse, 423, "block stale token after account deletion");

    const [identityRemoved, deletionLock] = await Promise.all([
      auth.getUser(userId).then(() => false).catch((error) => error?.code === "auth/user-not-found"),
      db.collection("reviewDeletionLocks").doc(userId).get(),
    ]);
    if (!identityRemoved) throw new Error("Firebase identity remained after owned-data deletion.");
    if (!deletionLock.exists) throw new Error("The stale-token application lock was not retained after account deletion.");
    addResult("retain stale-token deletion lock", true);

    await writeReport({ baseUrl, finishedAt: new Date().toISOString(), results });
    console.log(`Staging account journey summary: ${results.length}/${results.length} checks passed`);
    console.log(`Staging account journey report: ${resolve(reportPath)}`);
  } catch (error) {
    addResult("journey failure", false, error instanceof Error ? error.message : "unknown failure");
    await writeReport({ baseUrl, finishedAt: new Date().toISOString(), results });
    throw error;
  } finally {
    if (userId) await cleanupDisposableAccount(auth, db, userId);
    await deleteApp(app);
  }
}

export function assertNonProductionTarget(baseUrl, mutationApproval) {
  if (mutationApproval !== "true") throw new Error("Set SMOKE_ALLOW_ACCOUNT_MUTATION=true only for an approved disposable staging journey.");
  let hostname;
  try { hostname = new URL(baseUrl).hostname.toLowerCase(); } catch { throw new Error("SMOKE_BASE_URL must be a valid staging URL."); }
  if (["iroguide.com", "www.iroguide.com", "iro-guide.vercel.app"].includes(hostname)) throw new Error("Disposable account mutation is blocked on production aliases.");
  if (!hostname.includes("staging") && !hostname.endsWith(".vercel.app")) throw new Error("Disposable account mutation requires a staging or immutable preview host.");
}

async function apiRequest(baseUrl, path, idToken, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
      Origin: new URL(baseUrl).origin,
      ...(deploymentProtectionBypass ? { "x-vercel-protection-bypass": deploymentProtectionBypass } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
}

async function identityRequest(apiKey, operation, body) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Firebase ${operation} failed with status ${response.status}.`);
  return payload;
}

function expectStatus(response, expected, name) {
  const ok = response.status === expected;
  addResult(name, ok, `status=${response.status}`);
  if (!ok) throw new Error(`${name} returned ${response.status}; expected ${expected}.`);
}

async function cleanupDisposableAccount(auth, db, userId) {
  const collections = ["accountExperiences", "sampleCritiqueProgress", "selfReviewSessions", "designBriefDrafts", "reviewAccessInterests", "reviews", "reviewDrafts"];
  await Promise.allSettled(collections.map(async (collection) => {
    const snapshot = await db.collection(collection).where("userId", "==", userId).limit(100).get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
  }));
  await Promise.allSettled([db.collection("accountExperiences").doc(userId).delete(), db.collection("reviewDeletionLocks").doc(userId).delete(), auth.deleteUser(userId)]);
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the staging account journey.`);
  return value;
}

function requiredString(value, message) {
  if (typeof value !== "string" || !value) throw new Error(message);
  return value;
}

function parseJwtPayload(token) {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Firebase ID token is not a JWT.");
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid payload");
    return parsed;
  } catch {
    throw new Error("Firebase ID token payload could not be decoded.");
  }
}

function addResult(name, ok, detail = "") { results.push({ name, ok, detail }); }

async function writeReport(report) {
  const fullPath = resolve(reportPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
