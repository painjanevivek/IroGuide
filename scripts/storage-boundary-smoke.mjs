import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import nextEnv from "@next/env";
import { getServiceAccount } from "./production-smoke.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const reportPath = process.env.STORAGE_BOUNDARY_REPORT_PATH ?? "artifacts/storage-boundary-smoke.json";
const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");

async function main() {
  assertStorageMutationApproval(process.env.SMOKE_ALLOW_STORAGE_MUTATION, process.env.SMOKE_STORAGE_ENVIRONMENT);
  const serviceAccount = getServiceAccount();
  const apiKey = requiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const bucketName = process.env.FIREBASE_ADMIN_STORAGE_BUCKET?.trim()
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim()
    || (serviceAccount?.projectId ? `${serviceAccount.projectId}.appspot.com` : "");
  if (!serviceAccount || !bucketName) throw new Error("Firebase Admin credentials and a Storage bucket are required.");

  const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId, storageBucket: bucketName }, `iroguide-storage-boundary-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(bucketName);
  const stamp = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const ownerUid = `storage-owner-${stamp}`;
  const otherUid = `storage-other-${stamp}`;
  const reviewId = `storage-proof-${stamp}`;
  const objectPath = `users/${ownerUid}/reviews/${reviewId}/source.png`;
  const results = [];

  try {
    await Promise.all([
      auth.createUser({ uid: ownerUid, email: `${ownerUid}@iroguide.test`, emailVerified: true }),
      auth.createUser({ uid: otherUid, email: `${otherUid}@iroguide.test`, emailVerified: true }),
      bucket.file(objectPath).save(onePixelPng, {
        resumable: false,
        metadata: { cacheControl: "private, max-age=0, no-transform", contentType: "image/png", metadata: { stagingSmoke: "true" } },
      }),
    ]);

    const [ownerToken, otherToken] = await Promise.all([
      createIdToken(auth, apiKey, ownerUid),
      createIdToken(auth, apiKey, otherUid),
    ]);
    const [ownerRead, otherRead] = await Promise.all([
      fetchStorageMetadata(bucketName, objectPath, ownerToken),
      fetchStorageMetadata(bucketName, objectPath, otherToken),
    ]);
    record(results, "owner can read the exact object", ownerRead.status === 200, ownerRead.status);
    record(results, "another account cannot read the object", isDenied(otherRead.status), otherRead.status);

    await db.collection("reviewDeletionLocks").doc(ownerUid).set({ userId: ownerUid, state: "locked", smoke: true });
    const lockedOwnerRead = await fetchStorageMetadata(bucketName, objectPath, ownerToken);
    record(results, "deletion lock blocks the former owner token", isDenied(lockedOwnerRead.status), lockedOwnerRead.status);

    await writeReport({ environment: "staging", finishedAt: new Date().toISOString(), results });
    console.log(`Storage boundary summary: ${results.filter((result) => result.ok).length}/${results.length} checks passed`);
    if (results.some((result) => !result.ok)) process.exitCode = 1;
  } finally {
    await Promise.allSettled([
      bucket.file(objectPath).delete({ ignoreNotFound: true }),
      db.collection("reviewDeletionLocks").doc(ownerUid).delete(),
      auth.deleteUser(ownerUid),
      auth.deleteUser(otherUid),
    ]);
    await deleteApp(app);
  }
}

export function assertStorageMutationApproval(approval, environment) {
  if (approval !== "true") throw new Error("Set SMOKE_ALLOW_STORAGE_MUTATION=true only for an approved disposable Storage proof.");
  if (environment !== "staging") throw new Error("The real Storage boundary proof is restricted to the staging environment.");
}

async function createIdToken(auth, apiKey, uid) {
  const customToken = await auth.createCustomToken(uid);
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const payload = await response.json();
  if (!response.ok || typeof payload.idToken !== "string") throw new Error(`Firebase token exchange failed with status ${response.status}.`);
  return payload.idToken;
}

async function fetchStorageMetadata(bucketName, objectPath, idToken) {
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectPath)}`;
  return fetch(url, { headers: { Authorization: `Firebase ${idToken}` } });
}

function isDenied(status) {
  return status === 401 || status === 403 || status === 404;
}

function record(results, name, ok, status) {
  results.push({ name, ok, detail: `status=${status}` });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} - status=${status}`);
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Storage boundary proof.`);
  return value;
}

async function writeReport(report) {
  const fullPath = resolve(reportPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Storage boundary report: ${fullPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
