import type { App, AppOptions } from "firebase-admin/app";

export class FirebaseAdminUnavailableError extends Error {
  constructor(message = "Account storage is not configured yet.") {
    super(message);
    this.name = "FirebaseAdminUnavailableError";
  }
}

export class FirebaseTokenVerificationError extends Error {
  constructor() {
    super("Sign in again before starting a critique.");
    this.name = "FirebaseTokenVerificationError";
  }
}

export async function verifyFirebaseIdToken(idToken: string) {
  try {
    const [{ getAuth }, app] = await Promise.all([
      import("firebase-admin/auth"),
      getFirebaseAdminApp(),
    ]);
    return await getAuth(app).verifyIdToken(idToken);
  } catch (error) {
    if (error instanceof FirebaseAdminUnavailableError) throw error;
    throw new FirebaseTokenVerificationError();
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
  if (serviceAccount) return { credential: cert(serviceAccount), projectId: serviceAccount.projectId };

  const projectId = getEnv("FIREBASE_ADMIN_PROJECT_ID") ?? getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") ?? getEnv("GOOGLE_CLOUD_PROJECT");
  if (hasApplicationDefaultCredentials()) return { credential: applicationDefault(), projectId };

  return null;
}

function getServiceAccountFromJson() {
  const rawValue = getEnv("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON");
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

function hasApplicationDefaultCredentials() {
  return Boolean(getEnv("GOOGLE_APPLICATION_CREDENTIALS") || getEnv("GOOGLE_CLOUD_PROJECT"));
}

function getEnv(key: string) {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}
