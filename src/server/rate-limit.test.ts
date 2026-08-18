import { describe, expect, it } from "vitest";
import { checkRateLimit, getRateLimitHeaders, isDistributedRateLimitRequired, resolveRateLimitMode } from "./rate-limit";

describe("rate-limit deployment guards", () => {
  it("allows local development requests until the configured limit is exceeded", async () => {
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

  it("returns standard rate-limit headers", async () => {
    const result = await checkRateLimit({ key: `headers-${Date.now()}-${Math.random()}`, limit: 1, windowMs: 60_000 });

    expect(getRateLimitHeaders(result)).toEqual(expect.objectContaining({
      "Retry-After": expect.any(String),
      "X-RateLimit-Limit": "1",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": expect.any(String),
    }));
  });

  it("requires a shared limiter in production but not Vercel previews", () => {
    expect(isDistributedRateLimitRequired({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(true);
    expect(isDistributedRateLimitRequired({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(false);
    expect(isDistributedRateLimitRequired({ NODE_ENV: "development" })).toBe(false);
  });

  it("fails closed rather than using an instance-local limiter in production", () => {
    expect(resolveRateLimitMode(false, { NODE_ENV: "production", VERCEL_ENV: "production" })).toBe("deny");
    expect(resolveRateLimitMode(true, { NODE_ENV: "production", VERCEL_ENV: "production" })).toBe("distributed");
    expect(resolveRateLimitMode(false, { NODE_ENV: "development" })).toBe("local");
  });
});
