import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? "https://iroguide.com");
const requireReady = process.env.SMOKE_REQUIRE_READY !== "false";
const runAuthenticatedReview = process.env.SMOKE_AUTHENTICATED_REVIEW !== "false";
const publicRoutes = ["/", "/about", "/projects", "/pricing", "/community", "/contact", "/privacy", "/terms"];

const results = [];

async function main() {
  for (const route of publicRoutes) {
    await expectStatus(route, { method: "GET" }, 200);
  }

  await expectStatus("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, 401);
  await expectStatus("/api/reviews/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{\"documents\":[]}" }, 401);
  await checkReadiness();

  if (runAuthenticatedReview) {
    await authenticatedReviewSmoke();
  }

  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    const suffix = result.detail ? ` - ${result.detail}` : "";
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${suffix}`);
  }

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

async function checkReadiness() {
  const name = "GET /api/readiness";
  try {
    const response = await fetch(`${baseUrl}/api/readiness`);
    const payload = await response.json();
    const ok = requireReady ? response.ok && payload.ok === true : response.status === 200 || response.status === 503;
    addResult(name, ok, `status=${response.status} accountStorage=${Boolean(payload.checks?.accountStorage)} liveVision=${Boolean(payload.checks?.liveVision)} provider=${payload.reviewProvider?.activeProvider ?? "unknown"}`);
  } catch (error) {
    addResult(name, false, getErrorMessage(error));
  }
}

async function authenticatedReviewSmoke() {
  const serviceAccount = getServiceAccount();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!serviceAccount || !apiKey) {
    addResult("authenticated review smoke", false, "missing Firebase Admin JSON or Firebase web API key");
    return;
  }

  const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId }, `iroguide-prod-smoke-${Date.now()}`);
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
    await deleteApp(app);
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
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
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

async function cleanupSmokeUser({ auth, db, uid }) {
  try {
    const snapshot = await db.collection("reviews").where("userId", "==", uid).limit(20).get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
  } catch {}

  try {
    await auth.deleteUser(uid);
  } catch {}
}

function getServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      projectId: parsed.project_id ?? parsed.projectId,
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      privateKey: parsed.private_key ?? parsed.privateKey,
    };
  } catch {
    return null;
  }
}

function addResult(name, ok, detail = "") {
  results.push({ name, ok, detail });
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "unknown error";
}

await main();
