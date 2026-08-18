import { createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const firebaseEnvironmentKeys = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64",
  "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "GOOGLE_CLOUD_PROJECT",
] as const;
const originalEnvironment = new Map(firebaseEnvironmentKeys.map((key) => [key, process.env[key]]));

describe("Firebase secure-token certificate retrieval", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    for (const key of firebaseEnvironmentKeys) delete process.env[key];
    process.env.FIREBASE_ADMIN_PROJECT_ID = "test-project";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    for (const key of firebaseEnvironmentKeys) {
      const value = originalEnvironment.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("coalesces concurrent certificate refreshes for forged tokens", async () => {
    let releaseFetch: (() => void) | undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      releaseFetch = () => resolve(certResponse({}));
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { FirebaseTokenVerificationError, verifyFirebaseIdToken } = await import("./firebase-admin");
    const token = createToken("attacker-key");

    const attempts = Promise.allSettled([
      verifyFirebaseIdToken(token),
      verifyFirebaseIdToken(token),
    ]);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    releaseFetch?.();

    const results = await attempts;
    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.reason).toBeInstanceOf(FirebaseTokenVerificationError);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("briefly negative-caches an unknown key when certificate caching is disabled", async () => {
    const fetchMock = vi.fn(async () => certResponse({}, "max-age=0"));
    vi.stubGlobal("fetch", fetchMock);
    const { verifyFirebaseIdToken } = await import("./firebase-admin");
    const token = createToken("unknown-key");

    await expect(verifyFirebaseIdToken(token)).rejects.toMatchObject({ name: "FirebaseTokenVerificationError" });
    await expect(verifyFirebaseIdToken(token)).rejects.toMatchObject({ name: "FirebaseTokenVerificationError" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("bounds a stalled certificate refresh with a deadline", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { verifyFirebaseIdToken } = await import("./firebase-admin");

    const rejection = expect(verifyFirebaseIdToken(createToken("slow-key"))).rejects.toMatchObject({
      detail: "Firebase certificate fetch timed out.",
      name: "FirebaseTokenVerificationError",
    });
    await vi.advanceTimersByTimeAsync(5_000);

    await rejection;
  });

  it("continues to verify a legitimately signed Firebase token", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2_048 });
    const kid = "trusted-key";
    const fetchMock = vi.fn(async () => certResponse({
      [kid]: publicKey.export({ format: "pem", type: "spki" }).toString(),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { verifyFirebaseIdToken } = await import("./firebase-admin");

    const verified = await verifyFirebaseIdToken(createToken(kid, privateKey));

    expect(verified.uid).toBe("firebase-user-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function certResponse(certs: Record<string, string>, cacheControl = "max-age=3600") {
  return new Response(JSON.stringify(certs), {
    headers: { "cache-control": cacheControl, "content-type": "application/json" },
    status: 200,
  });
}

function createToken(kid: string, privateKey?: Parameters<ReturnType<typeof createSign>["sign"]>[0]) {
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = encodeJwtSegment({ alg: "RS256", kid });
  const encodedPayload = encodeJwtSegment({
    aud: "test-project",
    exp: now + 3_600,
    iat: now,
    iss: "https://securetoken.google.com/test-project",
    sub: "firebase-user-1",
  });
  const signedContent = `${encodedHeader}.${encodedPayload}`;
  const signature = privateKey
    ? createSign("RSA-SHA256").update(signedContent).end().sign(privateKey).toString("base64url")
    : Buffer.from("forged-signature").toString("base64url");
  return `${signedContent}.${signature}`;
}

function encodeJwtSegment(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
