import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "@/server/firebase-admin";

type ProofContext = {
  deploymentProtectionBypass?: string;
  origin: string;
};

type ProofResult = {
  detail?: string;
  name: string;
  ok: boolean;
};

type ReadinessPayload = {
  capabilities?: Record<string, unknown>;
  checks?: Record<string, unknown>;
  ok?: unknown;
  operations?: Record<string, unknown>;
};

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");

export function isValidStagingProofSecret(supplied: string | null) {
  const expected = process.env.IROGUIDE_STAGING_PROOF_SECRET?.trim();
  if (process.env.VERCEL_ENV !== "preview" || !expected || !supplied) return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

export async function runPrivilegedReadinessProof(context: ProofContext) {
  const apiKey = requiredValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "NEXT_PUBLIC_FIREBASE_API_KEY");
  const adminUid = firstCsvValue(process.env.IROGUIDE_ADMIN_UIDS);
  if (!adminUid) throw new Error("No operator UID is configured for the preview deployment.");
  const auth = await getFirebaseAdminAuth();
  await auth.getUser(adminUid);
  const idToken = await exchangeCustomToken(apiKey, await auth.createCustomToken(adminUid));
  const response = await fetch(`${context.origin}/api/admin/readiness`, {
    headers: appHeaders(context, { Authorization: `Bearer ${idToken}`, Origin: context.origin }),
  });
  const payload = await response.json() as ReadinessPayload;
  const failures = getReadinessFailures(response.status, payload);
  return {
    ok: failures.length === 0,
    results: [result("authorized operator readiness", failures.length === 0, failures.join("; "))],
    summary: {
      communityClosed: payload?.operations?.communityGate === "closed",
      coreChecksReady: ["accountStorage", "clientIdentity", "firebaseProjectMatch", "productEvidence", "providerControls", "rateLimitAdapter", "requestBudgets", "reviewPipeline"].every((key) => payload?.checks?.[key] === true),
      externalCapabilitiesClosed: ["liveCritique", "improvementTracking", "revisionComparison", "followUpConversation", "privatePortfolio", "publicPortfolio", "community", "billing", "bugReportEmail", "reviewPipeline", "sourceImageStorage"].every((key) => payload?.capabilities?.[key] === false),
      guidedLearning: payload?.capabilities?.guidedLearning === true,
      profile: payload?.capabilities?.profile ?? "unknown",
    },
  };
}

export async function runDisposableAccountProof(context: ProofContext) {
  const apiKey = requiredValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "NEXT_PUBLIC_FIREBASE_API_KEY");
  const auth = await getFirebaseAdminAuth();
  const db = await getFirebaseAdminFirestore();
  const email = `activation-smoke-${Date.now()}-${randomBytes(4).toString("hex")}@iroguide.test`;
  const password = `IroGuide-${randomBytes(18).toString("base64url")}!`;
  const results: ProofResult[] = [];
  let userId = "";

  try {
    const created = await identityRequest(apiKey, "signUp", { email, password, returnSecureToken: true });
    userId = requiredString(created.localId, "Firebase sign-up did not return an account ID.");
    results.push(result("create disposable account", true));
    const initialClaims = parseJwtPayload(requiredString(created.idToken, "Firebase sign-up did not return an ID token."));
    if (initialClaims.email_verified === true) throw new Error("The disposable account unexpectedly started verified.");
    results.push(result("new account starts unverified", true));

    await auth.updateUser(userId, { emailVerified: true });
    results.push(result("verify disposable account", true));

    const signedIn = await identityRequest(apiKey, "signInWithPassword", { email, password, returnSecureToken: true });
    const idToken = requiredString(signedIn.idToken, "Firebase sign-in did not return an ID token.");
    if (parseJwtPayload(idToken).email_verified !== true) throw new Error("Fresh sign-in did not carry the verified-email claim.");
    results.push(result("sign out and sign back in", true));
    results.push(result("fresh token carries verified-email claim", true));

    const initial = await apiRequest(context, "/api/account/experience", idToken);
    expectStatus(results, initial, 200, "load account experience");
    const initialRevision = (await initial.json())?.experience?.revision;
    if (!Number.isInteger(initialRevision)) throw new Error("Account experience did not expose a bounded revision.");

    const updated = await apiRequest(context, "/api/account/experience", idToken, {
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
    expectStatus(results, updated, 200, "update account experience");

    const createdProject = await apiRequest(context, "/api/projects", idToken, {
      method: "POST",
      body: {
        schemaVersion: 1,
        mutationId: randomUUID(),
        name: "Staging proof project",
        category: "website",
        goal: "Verify owner-scoped project persistence and cleanup",
      },
    });
    expectStatus(results, createdProject, 201, "create project");
    const projectId = requiredString((await createdProject.json())?.project?.id, "Project creation did not return an ID.");

    const savedBrief = await apiRequest(context, "/api/design-briefs", idToken, {
      method: "PUT",
      body: {
        schemaVersion: 1,
        id: `staging-smoke-${randomUUID()}`,
        expectedRevision: null,
        mutationId: randomUUID(),
        projectId,
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
    expectStatus(results, savedBrief, 200, "save design brief");

    const exported = await apiRequest(context, "/api/account/export", idToken, { method: "POST", body: { schemaVersion: 1 } });
    expectStatus(results, exported, 200, "export owned account data");
    const exportPayload = await exported.json();
    if (exportPayload?.schemaVersion !== 1 || exportPayload?.learning?.briefs?.length !== 1 || exportPayload?.projects?.length !== 1) {
      throw new Error("Account export did not contain the single owned project and brief.");
    }

    expectStatus(results, await apiRequest(context, "/api/account/reviews", idToken, { method: "DELETE" }), 200, "purge review history");
    expectStatus(results, await apiRequest(context, "/api/account/experience", idToken, { method: "DELETE", body: { schemaVersion: 1, scope: "learning-history" } }), 200, "clear learning history");
    const remainingBriefs = await apiRequest(context, "/api/design-briefs", idToken);
    expectStatus(results, remainingBriefs, 200, "verify learning purge");
    if ((await remainingBriefs.json())?.records?.length !== 0) throw new Error("Learning purge left a brief behind.");

    const deleted = await apiRequest(context, "/api/account", idToken, { method: "DELETE" });
    expectStatus(results, deleted, 200, "delete disposable account");
    if ((await deleted.json())?.deleted !== true) throw new Error("Account deletion did not report a terminal result.");
    expectStatus(results, await apiRequest(context, "/api/account/experience", idToken), 423, "block stale token after account deletion");

    const [identityRemoved, deletionLock] = await Promise.all([
      auth.getUser(userId).then(() => false).catch((error) => error?.code === "auth/user-not-found"),
      db.collection("reviewDeletionLocks").doc(userId).get(),
    ]);
    if (!identityRemoved || !deletionLock.exists) throw new Error("Identity deletion or the stale-token application lock was not retained.");
    results.push(result("retain stale-token deletion lock", true));
    return { ok: true, results };
  } finally {
    if (userId) await cleanupDisposableAccount(auth, db, userId);
  }
}

export async function runTokenRevocationProof(context: ProofContext) {
  const apiKey = requiredValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "NEXT_PUBLIC_FIREBASE_API_KEY");
  const auth = await getFirebaseAdminAuth();
  const db = await getFirebaseAdminFirestore();
  const stamp = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const userId = `token-revocation-${stamp}`;
  const results: ProofResult[] = [];

  try {
    await auth.createUser({ uid: userId, email: `${userId}@iroguide.test`, emailVerified: true });
    const initialToken = await exchangeCustomToken(apiKey, await auth.createCustomToken(userId));
    expectStatus(results, await apiRequest(context, "/api/account/experience", initialToken), 200, "accept current token");

    const initialAuthTime = requiredNumber(parseJwtPayload(initialToken).auth_time, "Initial token did not contain auth_time.");
    await waitUntilNextSecond(initialAuthTime);
    await auth.revokeRefreshTokens(userId);
    const revokedUser = await auth.getUser(userId);
    const validAfter = revokedUser.tokensValidAfterTime ? Date.parse(revokedUser.tokensValidAfterTime) / 1_000 : Number.NaN;
    if (!Number.isFinite(validAfter) || validAfter <= initialAuthTime) throw new Error("Firebase did not advance the token-valid-after boundary.");
    expectStatus(results, await apiRequest(context, "/api/account/experience", initialToken), 401, "reject token after refresh-token revocation");

    const currentToken = await exchangeCustomToken(apiKey, await auth.createCustomToken(userId));
    expectStatus(results, await apiRequest(context, "/api/account/experience", currentToken), 200, "accept token from a new authentication session");

    await auth.updateUser(userId, { disabled: true });
    expectStatus(results, await apiRequest(context, "/api/account/experience", currentToken), 401, "reject token for disabled account");
    return { ok: results.every((item) => item.ok), results };
  } finally {
    await cleanupDisposableAccount(auth, db, userId);
  }
}

export async function runStorageBoundaryProof() {
  const apiKey = requiredValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "NEXT_PUBLIC_FIREBASE_API_KEY");
  const auth = await getFirebaseAdminAuth();
  const db = await getFirebaseAdminFirestore();
  const bucket = await getFirebaseAdminStorageBucket();
  const stamp = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const ownerUid = `storage-owner-${stamp}`;
  const otherUid = `storage-other-${stamp}`;
  const objectPath = `users/${ownerUid}/reviews/storage-proof-${stamp}/source.png`;
  const results: ProofResult[] = [];

  try {
    await Promise.all([
      auth.createUser({ uid: ownerUid, email: `${ownerUid}@iroguide.test`, emailVerified: true }),
      auth.createUser({ uid: otherUid, email: `${otherUid}@iroguide.test`, emailVerified: true }),
      bucket.file(objectPath).save(png, { resumable: false, metadata: { cacheControl: "private, max-age=0, no-transform", contentType: "image/png", metadata: { stagingSmoke: "true" } } }),
    ]);
    const [ownerToken, otherToken] = await Promise.all([
      exchangeCustomToken(apiKey, await auth.createCustomToken(ownerUid)),
      exchangeCustomToken(apiKey, await auth.createCustomToken(otherUid)),
    ]);
    const [ownerRead, otherRead] = await Promise.all([
      fetchStorageMetadata(bucket.name, objectPath, ownerToken),
      fetchStorageMetadata(bucket.name, objectPath, otherToken),
    ]);
    results.push(result("owner can read the exact object", ownerRead.status === 200, `status=${ownerRead.status}`));
    results.push(result("another account cannot read the object", isDenied(otherRead.status), `status=${otherRead.status}`));
    await db.collection("reviewDeletionLocks").doc(ownerUid).set({ userId: ownerUid, state: "locked", smoke: true });
    const lockedRead = await fetchStorageMetadata(bucket.name, objectPath, ownerToken);
    results.push(result("deletion lock blocks the former owner token", isDenied(lockedRead.status), `status=${lockedRead.status}`));
    return { ok: results.every((item) => item.ok), results };
  } finally {
    await Promise.allSettled([
      bucket.file(objectPath).delete({ ignoreNotFound: true }),
      db.collection("reviewDeletionLocks").doc(ownerUid).delete(),
      auth.deleteUser(ownerUid),
      auth.deleteUser(otherUid),
    ]);
  }
}

function getReadinessFailures(status: number, payload: ReadinessPayload) {
  const failures: string[] = [];
  if (status !== 200 || payload?.ok !== true) failures.push(`readiness status=${status}`);
  if (payload?.capabilities?.profile !== "free" || payload?.capabilities?.guidedLearning !== true) failures.push("free guided-learning profile is not ready");
  for (const key of ["liveCritique", "improvementTracking", "revisionComparison", "followUpConversation", "privatePortfolio", "publicPortfolio", "community", "billing", "bugReportEmail", "reviewPipeline", "sourceImageStorage"]) if (payload?.capabilities?.[key] !== false) failures.push(`${key} must remain disabled`);
  for (const key of ["accountStorage", "clientIdentity", "firebaseProjectMatch", "productEvidence", "providerControls", "rateLimitAdapter", "requestBudgets", "reviewPipeline"]) if (payload?.checks?.[key] !== true) failures.push(`${key} is not ready`);
  if (payload?.operations?.communityGate !== "closed") failures.push("Community gate is not closed");
  return failures;
}

async function apiRequest(context: ProofContext, path: string, idToken: string, options: { body?: unknown; method?: string } = {}) {
  return fetch(`${context.origin}${path}`, {
    method: options.method ?? "GET",
    headers: appHeaders(context, {
      Authorization: `Bearer ${idToken}`,
      Origin: context.origin,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    }),
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
}

function appHeaders(context: ProofContext, headers: Record<string, string>) {
  return { ...headers, ...(context.deploymentProtectionBypass ? { "x-vercel-protection-bypass": context.deploymentProtectionBypass } : {}) };
}

async function identityRequest(apiKey: string, operation: string, body: Record<string, unknown>) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Firebase ${operation} failed with status ${response.status}.`);
  return payload;
}

async function exchangeCustomToken(apiKey: string, customToken: string) {
  const payload = await identityRequest(apiKey, "signInWithCustomToken", { token: customToken, returnSecureToken: true });
  return requiredString(payload.idToken, "Firebase token exchange did not return an ID token.");
}

async function fetchStorageMetadata(bucketName: string, objectPath: string, idToken: string) {
  return fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectPath)}`, {
    headers: { Authorization: `Firebase ${idToken}` },
  });
}

async function cleanupDisposableAccount(auth: Awaited<ReturnType<typeof getFirebaseAdminAuth>>, db: Awaited<ReturnType<typeof getFirebaseAdminFirestore>>, userId: string) {
  const collections = ["accountExperiences", "sampleCritiqueProgress", "selfReviewSessions", "designBriefDrafts", "reviewAccessInterests", "reviews", "reviewDrafts", "projects", "projectMutationReceipts"];
  await Promise.allSettled(collections.map(async (collection) => {
    const snapshot = await db.collection(collection).where("userId", "==", userId).limit(100).get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
  }));
  await Promise.allSettled([db.collection("accountExperiences").doc(userId).delete(), db.collection("reviewDeletionLocks").doc(userId).delete(), auth.deleteUser(userId)]);
}

function expectStatus(results: ProofResult[], response: Response, expected: number, name: string) {
  results.push(result(name, response.status === expected, `status=${response.status}`));
  if (response.status !== expected) throw new Error(`${name} returned ${response.status}; expected ${expected}.`);
}

function result(name: string, ok: boolean, detail = ""): ProofResult {
  return { name, ok, ...(detail ? { detail } : {}) };
}

function isDenied(status: number) { return status === 401 || status === 403 || status === 404; }
function firstCsvValue(value: string | undefined) { return value?.split(",").map((item) => item.trim()).find(Boolean) ?? ""; }
function requiredValue(rawValue: string | undefined, name: string) { const value = rawValue?.trim(); if (!value) throw new Error(`${name} is required.`); return value; }
function requiredString(value: unknown, message: string) { if (typeof value !== "string" || !value) throw new Error(message); return value; }
function requiredNumber(value: unknown, message: string) { if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(message); return value; }

function parseJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Firebase ID token is not a JWT.");
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid payload");
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Firebase ID token payload could not be decoded.");
  }
}

async function waitUntilNextSecond(authTimeSeconds: number) {
  const remainingMs = ((authTimeSeconds + 1) * 1_000) - Date.now() + 25;
  if (remainingMs > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(remainingMs, 1_100)));
}
