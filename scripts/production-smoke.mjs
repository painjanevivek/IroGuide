import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { cert, deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage as getAdminStorage } from "firebase-admin/storage";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const startedAt = new Date();

export const EXPECTED_SECURITY_HEADERS = Object.freeze([
  { name: "strict-transport-security", value: "max-age=63072000; includeSubDomains; preload" },
  { name: "referrer-policy", value: "strict-origin-when-cross-origin" },
  { name: "x-content-type-options", value: "nosniff" },
  { name: "x-frame-options", value: "DENY" },
  { name: "permissions-policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { name: "cross-origin-opener-policy", value: "same-origin-allow-popups" },
  { name: "cross-origin-resource-policy", value: "same-origin" },
  { name: "x-dns-prefetch-control", value: "off" },
  { name: "x-download-options", value: "noopen" },
  { name: "x-permitted-cross-domain-policies", value: "none" },
]);

const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? "https://iroguide.com");
const reportPath = process.env.SMOKE_REPORT_PATH ?? "artifacts/production-smoke-report.json";
const requireReady = process.env.SMOKE_REQUIRE_READY !== "false";
const runAuthenticatedReview = process.env.SMOKE_AUTHENTICATED_REVIEW !== "false";
const runSecurityHeaders = process.env.SMOKE_SECURITY_HEADERS !== "false";
const runFirebaseRules = process.env.SMOKE_FIREBASE_RULES !== "false";
const publicRoutes = ["/", "/about", "/projects", "/pricing", "/community", "/contact", "/privacy", "/terms", "/.well-known/security.txt", "/security-policy.txt"];
const securityHeaderRoutes = getListEnv("SMOKE_SECURITY_HEADER_PATHS", ["/", "/api/readiness"]);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");

const results = [];

async function main() {
  console.log(`IroGuide production smoke target: ${baseUrl}`);

  for (const route of publicRoutes) {
    await expectStatus(route, { method: "GET" }, 200);
  }

  if (runSecurityHeaders) {
    for (const route of securityHeaderRoutes) {
      await checkSecurityHeaders(route);
    }
  }

  await expectStatus("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, 401);
  await expectStatus("/api/reviews/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{\"documents\":[]}" }, 401);
  await checkReadiness();

  if (runFirebaseRules) {
    await firebaseRulesSmoke();
  }

  if (runAuthenticatedReview) {
    await authenticatedReviewSmoke();
  }

  const failed = results.filter((result) => !result.ok);
  const report = {
    baseUrl,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    options: {
      requireReady,
      runAuthenticatedReview,
      runFirebaseRules,
      runSecurityHeaders,
      securityHeaderRoutes,
    },
    publicRoutes,
    results,
  };
  await writeReport(report);

  for (const result of results) {
    const suffix = result.detail ? ` - ${result.detail}` : "";
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${suffix}`);
  }
  console.log(`Production smoke report: ${resolve(reportPath)}`);
  console.log(`Production smoke summary: ${results.length - failed.length}/${results.length} checks passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function expectStatus(path, init, expectedStatus) {
  const name = `${init.method ?? "GET"} ${path}`;
  try {
    const response = await fetch(`${baseUrl}${path}`, init);
    addResult(name, response.status === expectedStatus, `status=${response.status}`);
  } catch (error) {
    addResult(name, false, getErrorMessage(error));
  }
}

async function checkSecurityHeaders(path) {
  const name = `security headers ${path}`;
  try {
    const response = await fetch(`${baseUrl}${path}`, { method: "GET" });
    const evaluation = evaluateSecurityHeaders(response.headers, { expectCsp: !path.startsWith("/api/") });
    addResult(name, evaluation.ok, `status=${response.status} ${evaluation.detail}`);
  } catch (error) {
    addResult(name, false, getErrorMessage(error));
  }
}

export function evaluateSecurityHeaders(headers, { expectCsp = true } = {}) {
  const failures = [];

  if (expectCsp) failures.push(...getContentSecurityPolicyFailures(headers.get("content-security-policy") ?? ""));

  for (const expected of EXPECTED_SECURITY_HEADERS) {
    const actual = headers.get(expected.name);
    if (!actual) {
      failures.push(`${expected.name}=missing`);
      continue;
    }

    if (actual.trim() !== expected.value) {
      failures.push(`${expected.name}=unexpected`);
    }
  }

  return {
    ok: failures.length === 0,
    detail: failures.length > 0 ? failures.join(", ") : `headers=${EXPECTED_SECURITY_HEADERS.length + (expectCsp ? 1 : 0)}`,
  };
}

function getContentSecurityPolicyFailures(policy) {
  if (!policy) return ["content-security-policy=missing"];

  const failures = [];
  const scriptSrc = getCspDirective(policy, "script-src");
  const styleSrc = getCspDirective(policy, "style-src");
  const connectSrc = getCspDirective(policy, "connect-src");
  const requiredDirectives = ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"];
  for (const directive of requiredDirectives) {
    if (!policy.includes(directive)) failures.push(`content-security-policy=${directive}-missing`);
  }
  if (!/'nonce-[A-Za-z0-9+/_=-]+'/.test(scriptSrc)) failures.push("content-security-policy=script-nonce-missing");
  if (scriptSrc.includes("'unsafe-inline'")) failures.push("content-security-policy=unsafe-inline-script");
  if (scriptSrc.includes("'unsafe-eval'")) failures.push("content-security-policy=unsafe-eval-script");
  if (!/'nonce-[A-Za-z0-9+/_=-]+'/.test(styleSrc)) failures.push("content-security-policy=style-nonce-missing");
  if (styleSrc.includes("'unsafe-inline'")) failures.push("content-security-policy=unsafe-inline-style");
  if (/https?:\/\/localhost(?::\d+)?/i.test(connectSrc)) failures.push("content-security-policy=localhost-connect-source");
  return failures;
}

function getCspDirective(policy, directive) {
  return policy.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${directive} `)) ?? "";
}

async function checkReadiness() {
  const name = "GET /api/readiness";
  try {
    const response = await fetch(`${baseUrl}/api/readiness`);
    const payload = await response.json();
    const ok = requireReady ? response.ok && payload.ok === true : response.status === 200 || response.status === 503;
    addResult(name, ok, `status=${response.status} accountStorage=${Boolean(payload.checks?.accountStorage)} bugReportEmail=${Boolean(payload.checks?.bugReportEmail)} liveVision=${Boolean(payload.checks?.liveVision)} provider=${payload.reviewProvider?.activeProvider ?? "unknown"}`);
  } catch (error) {
    addResult(name, false, getErrorMessage(error));
  }
}

async function firebaseRulesSmoke() {
  const settings = getFirebaseSmokeSettings();
  if (settings.missing.length > 0) {
    addResult("Firebase cross-user rules smoke", false, `missing ${settings.missing.join(", ")}`);
    return;
  }

  const { apiKey, projectId, serviceAccount, storageBucket } = settings;
  const app = initializeAdminApp({
    credential: cert(serviceAccount),
    projectId,
    storageBucket,
  }, `iroguide-prod-rules-smoke-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const bucket = getAdminStorage(app).bucket(storageBucket);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ownerUid = `smoke-owner-${stamp}`;
  const otherUid = `smoke-other-${stamp}`;
  const reviewId = `production-smoke-${stamp}`;
  const storagePath = `users/${ownerUid}/reviews/${reviewId}/source.png`;

  try {
    const [ownerCustomToken, otherCustomToken] = await Promise.all([
      auth.createCustomToken(ownerUid),
      auth.createCustomToken(otherUid),
    ]);
    const [ownerIdToken, otherIdToken] = await Promise.all([
      exchangeCustomToken(apiKey, ownerCustomToken),
      exchangeCustomToken(apiKey, otherCustomToken),
    ]);

    await db.collection("reviews").doc(reviewId).set({
      id: reviewId,
      userId: ownerUid,
      status: "complete",
      savedAt: new Date().toISOString(),
      sourceImagePath: storagePath,
      smoke: true,
    });
    await bucket.file(storagePath).save(png, {
      resumable: false,
      metadata: {
        cacheControl: "private, max-age=0, no-transform",
        contentType: "image/png",
        metadata: { smoke: "true" },
      },
    });

    const [ownerReview, otherReview, ownerStorage, otherStorage] = await Promise.all([
      fetchFirestoreDocument({ projectId, documentPath: `reviews/${reviewId}`, idToken: ownerIdToken }),
      fetchFirestoreDocument({ projectId, documentPath: `reviews/${reviewId}`, idToken: otherIdToken }),
      fetchStorageMetadata({ bucketName: storageBucket, storagePath, idToken: ownerIdToken }),
      fetchStorageMetadata({ bucketName: storageBucket, storagePath, idToken: otherIdToken }),
    ]);

    const ok = ownerReview.ok
      && isDeniedStatus(otherReview.status)
      && ownerStorage.ok
      && isDeniedStatus(otherStorage.status);
    addResult(
      "Firebase cross-user rules smoke",
      ok,
      `reviewOwner=${ownerReview.status} reviewOther=${otherReview.status} storageOwner=${ownerStorage.status} storageOther=${otherStorage.status}`,
    );
  } catch (error) {
    addResult("Firebase cross-user rules smoke", false, getErrorMessage(error));
  } finally {
    await cleanupRulesSmoke({ auth, db, bucket, ownerUid, otherUid, reviewId, storagePath });
    await deleteAdminApp(app);
  }
}

async function authenticatedReviewSmoke() {
  const serviceAccount = getServiceAccount();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!serviceAccount || !apiKey) {
    addResult("authenticated review smoke", false, "missing Firebase Admin credentials or Firebase web API key");
    return;
  }

  const app = initializeAdminApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId }, `iroguide-prod-smoke-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const uid = `iroguide-prod-smoke-${Date.now()}`;

  try {
    const customToken = await auth.createCustomToken(uid);
    const idToken = await exchangeCustomToken(apiKey, customToken);
    const response = await submitReview(idToken);
    const payload = await response.json();
    if (!response.ok) {
      addResult("authenticated review smoke", false, `status=${response.status} error=${payload.error ?? "unknown"}`);
      return;
    }
    if (payload.persistence?.savedToAccount !== true || !payload.review?.id) {
      addResult("authenticated review smoke", false, "review did not report saved account persistence");
      return;
    }

    const snapshot = await db.collection("reviews").where("userId", "==", uid).limit(5).get();
    addResult("authenticated review smoke", !snapshot.empty, `provider=${payload.review.provider} savedDocs=${snapshot.size}`);
  } catch (error) {
    addResult("authenticated review smoke", false, getErrorMessage(error));
  } finally {
    await cleanupSmokeUser({ auth, db, uid });
    await deleteAdminApp(app);
  }
}

async function exchangeCustomToken(apiKey, customToken) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`token exchange failed: ${payload.error?.message ?? response.status}`);
  return payload.idToken;
}

async function submitReview(idToken) {
  const form = new FormData();
  form.append("category", "logo");
  form.append("mode", "mentor");
  form.append("brief", JSON.stringify({
    audience: "Production smoke test designers",
    purpose: "Validate production review persistence",
    style: "Minimal identity mark",
    goal: "Confirm production save path",
    concern: "Smoke test only",
  }));
  form.append("image", new Blob([png], { type: "image/png" }), "iroguide-production-smoke.png");

  return fetch(`${baseUrl}/api/reviews`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: form,
  });
}

async function fetchFirestoreDocument({ projectId, documentPath, idToken }) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${documentPath}`;
  return fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
}

async function fetchStorageMetadata({ bucketName, storagePath, idToken }) {
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(storagePath)}`;
  return fetch(url, { headers: { Authorization: `Firebase ${idToken}` } });
}

async function cleanupRulesSmoke({ auth, db, bucket, ownerUid, otherUid, reviewId, storagePath }) {
  await Promise.allSettled([
    db.collection("reviews").doc(reviewId).delete(),
    bucket.file(storagePath).delete({ ignoreNotFound: true }),
    auth.deleteUser(ownerUid),
    auth.deleteUser(otherUid),
  ]);
}

async function cleanupSmokeUser({ auth, db, uid }) {
  try {
    const snapshot = await db.collection("reviews").where("userId", "==", uid).limit(20).get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
  } catch {}

  try {
    await auth.deleteUser(uid);
  } catch {}
}

function getFirebaseSmokeSettings(env = process.env) {
  const serviceAccount = getServiceAccount(env);
  const projectId = serviceAccount?.projectId ?? getEnvValue(env, "FIREBASE_ADMIN_PROJECT_ID") ?? getEnvValue(env, "NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const apiKey = getEnvValue(env, "NEXT_PUBLIC_FIREBASE_API_KEY");
  const storageBucket = getEnvValue(env, "FIREBASE_ADMIN_STORAGE_BUCKET")
    ?? getEnvValue(env, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")
    ?? (projectId ? `${projectId}.appspot.com` : null);
  const missing = [];

  if (!serviceAccount) missing.push("Firebase Admin credentials");
  if (!apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!projectId) missing.push("Firebase project id");
  if (!storageBucket) missing.push("Firebase storage bucket");

  return { apiKey, missing, projectId, serviceAccount, storageBucket };
}

export function getServiceAccount(env = process.env) {
  return parseServiceAccount(getEnvValue(env, "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON") ?? getServiceAccountJsonFromBase64(env))
    ?? getSplitServiceAccount(env);
}

export function parseServiceAccount(raw) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const serviceAccount = {
      projectId: parsed.project_id ?? parsed.projectId,
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      privateKey: normalizePrivateKey(parsed.private_key ?? parsed.privateKey),
    };

    return isCompleteServiceAccount(serviceAccount) ? serviceAccount : null;
  } catch {
    return null;
  }
}

function getSplitServiceAccount(env) {
  const serviceAccount = {
    projectId: getEnvValue(env, "FIREBASE_ADMIN_PROJECT_ID") ?? getEnvValue(env, "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    clientEmail: getEnvValue(env, "FIREBASE_ADMIN_CLIENT_EMAIL"),
    privateKey: normalizePrivateKey(getEnvValue(env, "FIREBASE_ADMIN_PRIVATE_KEY")),
  };

  return isCompleteServiceAccount(serviceAccount) ? serviceAccount : null;
}

function getServiceAccountJsonFromBase64(env = process.env) {
  const encodedValue = getEnvValue(env, "FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64");
  if (!encodedValue) return null;

  try {
    return Buffer.from(encodedValue, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function isCompleteServiceAccount(serviceAccount) {
  return Boolean(serviceAccount?.projectId && serviceAccount.clientEmail && serviceAccount.privateKey);
}

function normalizePrivateKey(value) {
  return typeof value === "string" ? value.replace(/\\n/g, "\n") : value;
}

function addResult(name, ok, detail = "") {
  results.push({ name, ok, detail });
}

async function writeReport(report) {
  const fullPath = resolve(reportPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function getListEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function getEnvValue(env, name) {
  const value = env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isDeniedStatus(status) {
  return status === 401 || status === 403 || status === 404;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "unknown error";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
