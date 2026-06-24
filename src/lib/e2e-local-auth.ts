import type { User } from "firebase/auth";

const E2E_LOCAL_AUTH_STORAGE_KEY = "iroguide:e2e-local-auth-user";
const E2E_LOCAL_AUTH_TOKEN = "iroguide-e2e-local-token";

type LocalE2EUserRecord = {
  displayName: string;
  email: string;
  uid: string;
};

export function isE2ELocalAuthEnabled() {
  return process.env.NEXT_PUBLIC_E2E_LOCAL_AUTH === "true" && process.env.NODE_ENV !== "production";
}

export function createE2ELocalUser(email: string, displayName?: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  const record: LocalE2EUserRecord = {
    displayName: displayName?.trim() || "IroGuide E2E",
    email: normalizedEmail,
    uid: getE2EUserId(normalizedEmail),
  };

  return toFirebaseUser(record);
}

export function readE2ELocalUser(storage: Storage | null = getStorage()) {
  if (!storage) return null;

  try {
    const rawValue = storage.getItem(E2E_LOCAL_AUTH_STORAGE_KEY);
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue) as Partial<LocalE2EUserRecord>;
    if (!parsed.uid || !parsed.email || !parsed.displayName) return null;
    return toFirebaseUser({
      displayName: parsed.displayName,
      email: parsed.email,
      uid: parsed.uid,
    });
  } catch {
    return null;
  }
}

export function writeE2ELocalUser(user: User, storage: Storage | null = getStorage()) {
  if (!storage || !user.email) return;

  storage.setItem(E2E_LOCAL_AUTH_STORAGE_KEY, JSON.stringify({
    displayName: user.displayName ?? "IroGuide E2E",
    email: user.email,
    uid: user.uid,
  }));
}

export function clearE2ELocalUser(storage: Storage | null = getStorage()) {
  storage?.removeItem(E2E_LOCAL_AUTH_STORAGE_KEY);
}

function toFirebaseUser(record: LocalE2EUserRecord): User {
  const providerData = [{
    displayName: record.displayName,
    email: record.email,
    phoneNumber: null,
    photoURL: null,
    providerId: "password",
    uid: record.email,
  }];

  return {
    delete: async () => undefined,
    displayName: record.displayName,
    email: record.email,
    emailVerified: true,
    getIdToken: async () => E2E_LOCAL_AUTH_TOKEN,
    getIdTokenResult: async () => ({
      authTime: new Date().toISOString(),
      claims: {},
      expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      issuedAtTime: new Date().toISOString(),
      signInProvider: "password",
      signInSecondFactor: null,
      token: E2E_LOCAL_AUTH_TOKEN,
    }),
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    phoneNumber: null,
    photoURL: null,
    providerData,
    providerId: "firebase",
    refreshToken: E2E_LOCAL_AUTH_TOKEN,
    reload: async () => undefined,
    tenantId: null,
    toJSON: () => record,
    uid: record.uid,
  } as User;
}

function getE2EUserId(email: string) {
  return `e2e_${email.replace(/[^\w.-]/g, "_")}`;
}

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}
