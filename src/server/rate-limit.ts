import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const localBuckets = new Map<string, RateLimitBucket>();
const redis = createRedisClient();
const distributedLimiters = new Map<string, Ratelimit>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

/**
 * Applies a sliding-window limit shared by every server instance when Upstash
 * credentials are configured. Local development remains dependency-free.
 */
export async function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  if (!redis) return checkLocalRateLimit({ key, limit, windowMs });

  try {
    const result = await getDistributedLimiter(limit, windowMs).limit(key);
    return {
      allowed: result.success,
      limit: result.limit,
      remaining: Math.max(0, result.remaining),
      resetAt: result.reset,
      retryAfterSeconds: getRetryAfterSeconds(result.reset),
    };
  } catch {
    // A configured production limiter must never become an accidental bypass.
    // Reject while Redis is unavailable rather than allowing unbounded traffic.
    return getUnavailableResult(limit, windowMs);
  }
}

function checkLocalRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const currentBucket = localBuckets.get(key);
  const bucket = currentBucket && currentBucket.resetAt > now
    ? currentBucket
    : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  localBuckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

function cleanupExpiredBuckets(now: number) {
  if (localBuckets.size < 1_000) return;

  for (const [key, bucket] of localBuckets) {
    if (bucket.resetAt <= now) localBuckets.delete(key);
  }
}

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new Redis({ url, token });
}

function getDistributedLimiter(limit: number, windowMs: number) {
  const cacheKey = `${limit}:${windowMs}`;
  const cached = distributedLimiters.get(cacheKey);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    prefix: process.env.IROGUIDE_RATE_LIMIT_PREFIX?.trim() || "iroguide:rate-limit",
    ephemeralCache: new Map(),
    // Do not allow traffic by default when a Redis request times out.
    timeout: 0,
  });
  distributedLimiters.set(cacheKey, limiter);
  return limiter;
}

function getUnavailableResult(limit: number, windowMs: number): RateLimitResult {
  const resetAt = Date.now() + windowMs;
  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt,
    retryAfterSeconds: getRetryAfterSeconds(resetAt),
  };
}

function getRetryAfterSeconds(resetAt: number, now = Date.now()) {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}
