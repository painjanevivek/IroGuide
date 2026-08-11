import { generateKeyPairSync, sign } from "node:crypto";
import type { UserRecord } from "firebase-admin/auth";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const firebaseMocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({
  applicationDefault: vi.fn(),
  cert: vi.fn(),
  getApps: vi.fn(() => [{}]),
  initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: firebaseMocks.getAuth,
}));

import { FirebaseTokenVerificationError, verifyFirebaseIdToken, verifyRecentFirebaseIdToken } from "./firebase-admin";

const projectId = "test-project";
const userId = "firebase-user-123";
const originalProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const originalFetch = globalThis.fetch;
let privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];

beforeAll(() => {
  const keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  privateKey = keyPair.privateKey;
  const certificate = keyPair.publicKey.export({ type: "spki", format: "pem" }).toString();
  process.env.FIREBASE_ADMIN_PROJECT_ID = projectId;
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ "test-key": certificate }), {
    headers: { "cache-control": "max-age=3600" },
    status: 200,
  }));
});

afterAll(() => {
  if (originalProjectId === undefined) delete process.env.FIREBASE_ADMIN_PROJECT_ID;
  else process.env.FIREBASE_ADMIN_PROJECT_ID = originalProjectId;
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  firebaseMocks.getUser.mockReset();
  firebaseMocks.getAuth.mockReset();
  firebaseMocks.getAuth.mockReturnValue({ getUser: firebaseMocks.getUser });
});

describe("Firebase ID token account status", () => {
  it("accepts a valid token for an active current account", async () => {
    firebaseMocks.getUser.mockResolvedValue(createUserRecord());
    const issuedAt = nowSeconds() - 30;

    await expect(verifyFirebaseIdToken(createIdToken(issuedAt))).resolves.toMatchObject({
      iat: issuedAt,
      uid: userId,
    });
  });

  it("rejects a valid token when the account is disabled", async () => {
    firebaseMocks.getUser.mockResolvedValue(createUserRecord({ disabled: true }));

    await expect(verifyFirebaseIdToken(createIdToken(nowSeconds() - 30))).rejects.toBeInstanceOf(
      FirebaseTokenVerificationError,
    );
  });

  it("rejects a token issued before the account revocation time", async () => {
    const issuedAt = nowSeconds() - 30;
    firebaseMocks.getUser.mockResolvedValue(createUserRecord({
      tokensValidAfterTime: new Date((issuedAt + 1) * 1000).toISOString(),
    }));

    await expect(verifyFirebaseIdToken(createIdToken(issuedAt))).rejects.toBeInstanceOf(
      FirebaseTokenVerificationError,
    );
  });

  it("rejects a valid token when the account no longer exists", async () => {
    firebaseMocks.getUser.mockRejectedValue(Object.assign(new Error("User not found."), {
      code: "auth/user-not-found",
    }));

    await expect(verifyFirebaseIdToken(createIdToken(nowSeconds() - 30))).rejects.toMatchObject({
      code: "auth/user-not-found",
      name: "FirebaseTokenVerificationError",
    });
  });

  it("preserves the recent-login requirement for destructive actions", async () => {
    firebaseMocks.getUser.mockResolvedValue(createUserRecord());
    const issuedAt = nowSeconds() - 600;

    await expect(verifyRecentFirebaseIdToken(createIdToken(issuedAt, issuedAt))).rejects.toMatchObject({
      code: "auth/requires-recent-login",
      name: "FirebaseTokenVerificationError",
    });
  });
});

function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  const metadata = {
    creationTime: "Mon, 01 Jan 2024 00:00:00 GMT",
    lastSignInTime: "Mon, 01 Jan 2024 00:00:00 GMT",
    lastRefreshTime: "Mon, 01 Jan 2024 00:00:00 GMT",
    toJSON: () => ({}),
  };

  return {
    uid: userId,
    emailVerified: true,
    disabled: false,
    metadata,
    providerData: [],
    toJSON: () => ({}),
    ...overrides,
  };
}

function createIdToken(issuedAt: number, authTime = issuedAt) {
  const header = encodeJwtSegment({ alg: "RS256", kid: "test-key", typ: "JWT" });
  const payload = encodeJwtSegment({
    aud: projectId,
    auth_time: authTime,
    exp: nowSeconds() + 3600,
    iat: issuedAt,
    iss: `https://securetoken.google.com/${projectId}`,
    sub: userId,
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(unsignedToken), privateKey).toString("base64url");
  return `${unsignedToken}.${signature}`;
}

function encodeJwtSegment(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}
