import { Buffer } from "node:buffer";
import { createVerify } from "node:crypto";
import type { App, AppOptions } from "firebase-admin/app";

const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const MAX_TOKEN_AGE_SKEW_SECONDS = 300;
const MAX_DESTRUCTIVE_AUTH_AGE_SECONDS = 300;

let firebaseCertCache: {
  certs: Record<string, string>;
  expiresAt: number;
} | null = null;

export class FirebaseAdminUnavailableError extends Error {
  constructor(message = "Account storage is not configured yet.") {
    super(message);
    this.name = "FirebaseAdminUnavailableError";
  }
}

export class FirebaseTokenVerificationError extends Error {
  readonly code?: string;
  readonly detail?: string;

  constructor(code?: string, detail?: string) {
    super("Sign in again before starting a critique.");
    this.name = "FirebaseTokenVerificationError";
    this.code = code;
    this.detail = detail;
  }
}

type VerifiedFirebaseToken = FirebaseJwtPayload & {
  iat: number;
  sub: string;
  uid: string;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  const projectId = getFirebaseAdminProjectId();
  if (!projectId) throw new FirebaseAdminUnavailableError();

  try {
    return await verifyFirebaseSecureToken(idToken, projectId);
  } catch (error) {
    if (isFirebaseAdminUnavailableError(error)) throw error;
    throw new FirebaseTokenVerificationError(getFirebaseAuthErrorCode(error), getFirebaseAuthErrorDetail(error));
  }
}

export async function verifyRecentFirebaseIdToken(idToken: string) {
  const decodedToken = await verifyFirebaseIdToken(idToken);
  const authTime = decodedToken["auth_time"];
  const now = Math.floor(Date.now() / 1000);
  if (
    typeof authTime !== "number"
    || typeof decodedToken.iat !== "number"
    || authTime > now
    || now - authTime > MAX_DESTRUCTIVE_AUTH_AGE_SECONDS
  ) {
    throw new FirebaseTokenVerificationError("auth/requires-recent-login");
  }

  try {
    const user = await (await getFirebaseAdminAuth()).getUser(decodedToken.uid);
    const validAfter = user.tokensValidAfterTime ? Date.parse(user.tokensValidAfterTime) / 1000 : Number.NaN;
    if (user.disabled || (Number.isFinite(validAfter) && decodedToken.iat < validAfter)) {
      throw new Error("Firebase ID token is no longer valid.");
    }
    return decodedToken;
  } catch (error) {
    if (isFirebaseAdminUnavailableError(error)) throw error;
    throw new FirebaseTokenVerificationError(getFirebaseAuthErrorCode(error), getFirebaseAuthErrorDetail(error));
  }
}

export async function getFirebaseAdminFirestore() {
  const [{ getFirestore }, app] = await Promise.all([
    import("firebase-admin/firestore"),
    getFirebaseAdminApp(),
  ]);
  return getFirestore(app);
}

export async function getFirebaseAdminAuth() {
  const [{ getAuth }, app] = await Promise.all([
    import("firebase-admin/auth"),
    getFirebaseAdminApp(),
  ]);
  return getAuth(app);
}

export async function deleteFirebaseUser(uid: string) {
  const auth = await getFirebaseAdminAuth();
  await auth.deleteUser(uid);
}

export async function getFirebaseAdminStorageBucket() {
  const [{ getStorage }, app] = await Promise.all([
    import("firebase-admin/storage"),
    getFirebaseAdminApp(),
  ]);
  const bucketName = getEnv("FIREBASE_ADMIN_STORAGE_BUCKET") ?? getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  const storage = getStorage(app);

  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

export function isFirebaseAdminConfigured() {
  return Boolean(
    getServiceAccountFromJson()
    ?? getServiceAccountFromParts()
    ?? (hasApplicationDefaultCredentials() ? { projectId: getEnv("GOOGLE_CLOUD_PROJECT") } : null),
  );
}

export function getFirebaseAdminProjectId() {
  return getServiceAccountFromJson()?.projectId
    ?? getServiceAccountFromParts()?.projectId
    ?? getEnv("FIREBASE_ADMIN_PROJECT_ID")
    ?? getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
    ?? getEnv("GOOGLE_CLOUD_PROJECT")
    ?? null;
}

function isFirebaseAdminUnavailableError(error: unknown): error is FirebaseAdminUnavailableError {
  return error instanceof FirebaseAdminUnavailableError
    || (error instanceof Error && error.name === "FirebaseAdminUnavailableError");
}

function getFirebaseAuthErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  if (typeof error === "object" && error && "errorInfo" in error) {
    const errorInfo = error.errorInfo;
    if (typeof errorInfo === "object" && errorInfo && "code" in errorInfo && typeof errorInfo.code === "string") {
      return errorInfo.code;
    }
  }

  return undefined;
}

function getFirebaseAuthErrorDetail(error: unknown) {
  if (!(error instanceof Error)) return undefined;

  return error.message.replace(/[\r\n]+/g, " ").slice(0, 180);
}

async function verifyFirebaseSecureToken(idToken: string, projectId: string): Promise<VerifiedFirebaseToken> {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Firebase ID token must be a JWT.");
  }

  const header = parseJwtSegment<FirebaseJwtHeader>(encodedHeader);
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Firebase ID token has an unsupported signature.");
  }

  const payload = parseJwtSegment<FirebaseJwtPayload>(encodedPayload);
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) {
    throw new Error(`Firebase ID token audience mismatch for project ${projectId}.`);
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error(`Firebase ID token issuer mismatch for project ${projectId}.`);
  }
  if (typeof payload.sub !== "string" || payload.sub.length === 0 || payload.sub.length > 128) {
    throw new Error("Firebase ID token subject is invalid.");
  }
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new Error("Firebase ID token has expired.");
  }
  if (typeof payload.iat !== "number" || payload.iat > now + MAX_TOKEN_AGE_SKEW_SECONDS) {
    throw new Error("Firebase ID token issued-at time is invalid.");
  }

  const cert = (await getFirebaseSecureTokenCerts())[header.kid];
  if (!cert) throw new Error("Firebase ID token key is not recognized.");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const valid = verifier.verify(cert, base64UrlToBuffer(encodedSignature));
  if (!valid) throw new Error("Firebase ID token signature is invalid.");

  return {
    ...payload,
    uid: payload.sub,
  } as VerifiedFirebaseToken;
}

async function getFirebaseSecureTokenCerts() {
  if (firebaseCertCache && firebaseCertCache.expiresAt > Date.now()) return firebaseCertCache.certs;

  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) throw new Error(`Firebase certificate fetch failed with status ${response.status}.`);

  const certs = await response.json() as Record<string, string>;
  firebaseCertCache = {
    certs,
    expiresAt: Date.now() + getCacheMaxAgeMs(response.headers.get("cache-control")),
  };
  return certs;
}

function getCacheMaxAgeMs(cacheControl: string | null) {
  const maxAge = cacheControl?.match(/max-age=(\d+)/i)?.[1];
  return Number(maxAge ?? 3600) * 1000;
}

function parseJwtSegment<T>(segment: string) {
  try {
    return JSON.parse(base64UrlToBuffer(segment).toString("utf8")) as T;
  } catch {
    throw new Error("Firebase ID token contains invalid JSON.");
  }
}

function base64UrlToBuffer(value: string) {
  return Buffer.from(value, "base64url");
}

type FirebaseJwtHeader = {
  alg?: string;
  kid?: string;
};

type FirebaseJwtPayload = {
  aud?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string;
  [claim: string]: unknown;
};

async function getFirebaseAdminApp(): Promise<App> {
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const options = await getFirebaseAdminOptions();
  if (!options) throw new FirebaseAdminUnavailableError();

  return initializeApp(options);
}

async function getFirebaseAdminOptions(): Promise<AppOptions | null> {
  const { applicationDefault, cert } = await import("firebase-admin/app");
  const serviceAccount = getServiceAccountFromJson() ?? getServiceAccountFromParts();
  if (serviceAccount) {
    try {
      return { credential: cert(serviceAccount), projectId: serviceAccount.projectId, storageBucket: getFirebaseAdminStorageBucketName() };
    } catch {
      throw new FirebaseAdminUnavailableError("Account storage credentials are invalid.");
    }
  }

  const projectId = getEnv("FIREBASE_ADMIN_PROJECT_ID") ?? getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") ?? getEnv("GOOGLE_CLOUD_PROJECT");
  if (hasApplicationDefaultCredentials()) return { credential: applicationDefault(), projectId, storageBucket: getFirebaseAdminStorageBucketName() };

  return null;
}

function getFirebaseAdminStorageBucketName() {
  return getEnv("FIREBASE_ADMIN_STORAGE_BUCKET") ?? getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
}

function getServiceAccountFromJson() {
  const rawValue = getEnv("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON") ?? getServiceAccountJsonFromBase64();
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<Record<"project_id" | "projectId" | "client_email" | "clientEmail" | "private_key" | "privateKey", string>>;
    const projectId = parsed.project_id ?? parsed.projectId;
    const clientEmail = parsed.client_email ?? parsed.clientEmail;
    const privateKey = normalizePrivateKey(parsed.private_key ?? parsed.privateKey);
    if (!projectId || !clientEmail || !privateKey) return null;

    return { projectId, clientEmail, privateKey };
  } catch {
    return null;
  }
}

function getServiceAccountFromParts() {
  const projectId = getEnv("FIREBASE_ADMIN_PROJECT_ID") ?? getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const clientEmail = getEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = normalizePrivateKey(getEnv("FIREBASE_ADMIN_PRIVATE_KEY"));
  if (!projectId || !clientEmail || !privateKey) return null;

  return { projectId, clientEmail, privateKey };
}

function normalizePrivateKey(value?: string) {
  return value?.replace(/\\n/g, "\n");
}

function getServiceAccountJsonFromBase64() {
  const encodedValue = getEnv("FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64");
  if (!encodedValue) return undefined;

  try {
    return Buffer.from(encodedValue, "base64").toString("utf8");
  } catch {
    return undefined;
  }
}

function hasApplicationDefaultCredentials() {
  return Boolean(getEnv("GOOGLE_APPLICATION_CREDENTIALS") || getEnv("GOOGLE_CLOUD_PROJECT"));
}

function getEnv(key: string) {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}
