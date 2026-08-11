import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, getRateLimitHeaders, getRateLimitIdentity } from "./rate-limit";

const firestore = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>();
  const db = {
    collection: (collectionName: string) => ({
      doc: (documentId: string) => ({ id: documentId, path: `${collectionName}/${documentId}` }),
    }),
    runTransaction: async <T>(callback: (transaction: {
      getAll: (...references: Array<{ path: string }>) => Promise<Array<{ data: () => Record<string, unknown> | undefined }>>;
      set: (reference: { path: string }, value: Record<string, unknown>) => void;
    }) => Promise<T>) => {
      const writes = new Map<string, Record<string, unknown>>();
      const result = await callback({
        getAll: async (...references) => references.map((reference) => ({
          data: () => documents.get(reference.path),
        })),
        set: (reference, value) => writes.set(reference.path, structuredClone(value)),
      });
      for (const [path, value] of writes) documents.set(path, value);
      return result;
    },
  };

  return { db, documents };
});

vi.mock("@/server/firebase-admin", () => ({
  getFirebaseAdminFirestore: vi.fn(async () => firestore.db),
}));

beforeEach(() => {
  firestore.documents.clear();
  vi.stubEnv("IROGUIDE_RATE_LIMIT_HMAC_SECRET", "test-rate-limit-secret-that-is-at-least-32-characters");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rate limit", () => {
  it("enforces a shared global budget across distinct identities", async () => {
    const first = await checkRateLimit({
      key: "review:user-a",
      limit: 2,
      globalKey: "review:global",
      globalLimit: 2,
      windowMs: 60_000,
    });
    const second = await checkRateLimit({
      key: "review:user-b",
      limit: 2,
      globalKey: "review:global",
      globalLimit: 2,
      windowMs: 60_000,
    });
    const third = await checkRateLimit({
      key: "review:user-c",
      limit: 2,
      globalKey: "review:global",
      globalLimit: 2,
      windowMs: 60_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it("allows requests until the configured identity limit is exceeded", async () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const first = await checkRateLimit({ key, limit: 2, windowMs: 60_000 });
    const second = await checkRateLimit({ key, limit: 2, windowMs: 60_000 });
    const third = await checkRateLimit({ key, limit: 2, windowMs: 60_000 });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("rejects new identities when their bounded shard is full", async () => {
    const secret = "test-rate-limit-secret-that-is-at-least-32-characters";
    const digest = createHmac("sha256", secret).update("new-identity").digest("hex");
    const entries = Object.fromEntries(Array.from({ length: 64 }, (_, index) => [
      index.toString(16).padStart(62, "0"),
      { count: 1, resetAt: Date.now() + 60_000 },
    ]));
    firestore.documents.set(`rateLimitShards/${digest.slice(0, 2)}`, { entries });

    const result = await checkRateLimit({ key: "new-identity", limit: 2, windowMs: 60_000 });

    expect(result.allowed).toBe(false);
    expect(Object.keys(firestore.documents.get(`rateLimitShards/${digest.slice(0, 2)}`)?.entries as object)).toHaveLength(64);
  });

  it("reclaims an expired shard entry before admitting a new identity", async () => {
    const secret = "test-rate-limit-secret-that-is-at-least-32-characters";
    const digest = createHmac("sha256", secret).update("replacement-identity").digest("hex");
    const entries = Object.fromEntries(Array.from({ length: 64 }, (_, index) => [
      index.toString(16).padStart(62, "0"),
      { count: 1, resetAt: Date.now() + (index === 0 ? -1 : 60_000) },
    ]));
    firestore.documents.set(`rateLimitShards/${digest.slice(0, 2)}`, { entries });

    const result = await checkRateLimit({ key: "replacement-identity", limit: 2, windowMs: 60_000 });

    expect(result.allowed).toBe(true);
    expect(Object.keys(firestore.documents.get(`rateLimitShards/${digest.slice(0, 2)}`)?.entries as object)).toHaveLength(64);
  });

  it("uses only the authenticated user for a user-scoped budget", () => {
    const first = getRateLimitIdentity({
      request: new Request("https://iroguide.com/api/reviews", { headers: { "x-forwarded-for": "198.51.100.10" } }),
      scope: "review",
      userId: "firebase-user-123",
    });
    const second = getRateLimitIdentity({
      request: new Request("https://iroguide.com/api/reviews", { headers: { "x-forwarded-for": "203.0.113.20" } }),
      scope: "review",
      userId: "firebase-user-123",
    });

    expect(first).toBe("review:user:firebase-user-123");
    expect(second).toBe(first);
  });

  it("uses Vercel's protected forwarding header for public budgets", () => {
    vi.stubEnv("VERCEL", "1");
    const request = new Request("https://iroguide.com/api/bug-reports", {
      headers: {
        "x-forwarded-for": "198.51.100.10",
        "x-real-ip": "198.51.100.11",
        "x-vercel-forwarded-for": "203.0.113.7",
      },
    });

    expect(getRateLimitIdentity({ request, scope: "bug-report" })).toBe("bug-report:client:203.0.113.7");
  });

  it("does not trust caller-controlled forwarding headers outside Vercel", () => {
    const first = getRateLimitIdentity({
      request: new Request("https://iroguide.com/api/bug-reports", { headers: { "x-forwarded-for": "198.51.100.10" } }),
      scope: "bug-report",
    });
    const second = getRateLimitIdentity({
      request: new Request("https://iroguide.com/api/bug-reports", { headers: { "x-forwarded-for": "203.0.113.20" } }),
      scope: "bug-report",
    });

    expect(first).toBe("bug-report:client:shared");
    expect(second).toBe(first);
  });

  it("returns standard rate limit headers", async () => {
    const result = await checkRateLimit({ key: `headers-${Date.now()}-${Math.random()}`, limit: 1, windowMs: 60_000 });

    expect(getRateLimitHeaders(result)).toEqual(expect.objectContaining({
      "Retry-After": expect.any(String),
      "X-RateLimit-Limit": "1",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": expect.any(String),
    }));
  });
});
