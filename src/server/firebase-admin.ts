import { Buffer } from "node:buffer";
import type { App, AppOptions } from "firebase-admin/app";

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

export async function verifyFirebaseIdToken(idToken: string) {
  let app: App;
  try {
    app = await getFirebaseAdminApp();
  } catch (error) {
    if (isFirebaseAdminUnavailableError(error)) throw error;
    throw new FirebaseAdminUnavailableError("Account storage credentials are invalid.");
  }

  try {
    const { getAuth } = await import("firebase-admin/auth");
    return await getAuth(app).verifyIdToken(idToken);
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
      return { credential: cert(serviceAccount), projectId: serviceAccount.projectId };
    } catch {
      throw new FirebaseAdminUnavailableError("Account storage credentials are invalid.");
    }
  }

  const projectId = getEnv("FIREBASE_ADMIN_PROJECT_ID") ?? getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") ?? getEnv("GOOGLE_CLOUD_PROJECT");
  if (hasApplicationDefaultCredentials()) return { credential: applicationDefault(), projectId };

  return null;
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
