import { createHmac } from "node:crypto";
import { FirebaseAdminUnavailableError, getFirebaseAdminFirestore } from "@/server/firebase-admin";

type RateLimitOptions = {
  globalKey?: string;
  globalLimit?: number;
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitBudget = {
  entryId: string;
  limit: number;
  shardId: string;
};

type RateLimitShard = {
  entries: Record<string, RateLimitBucket>;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const RATE_LIMIT_COLLECTION = "rateLimitShards";
const MAX_ACTIVE_ENTRIES_PER_SHARD = 64;

export async function checkRateLimit({
  globalKey,
  globalLimit,
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const secret = getRateLimitSecret();
  const budgets = [
    createBudget(key, limit, secret),
    ...(globalKey && globalLimit ? [createBudget(globalKey, globalLimit, secret)] : []),
  ];
  const db = await getFirebaseAdminFirestore();
  const shardIds = Array.from(new Set(budgets.map((budget) => budget.shardId)));
  const references = shardIds.map((shardId) => db.collection(RATE_LIMIT_COLLECTION).doc(shardId));
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(...references);
    const shards = new Map(shardIds.map((shardId, index) => [
      shardId,
      parseShard(snapshots[index]?.data(), now),
    ]));
    const results = budgets.map((budget) => consumeBudget(shards.get(budget.shardId)!, budget, now, windowMs));

    references.forEach((reference, index) => {
      transaction.set(reference, shards.get(shardIds[index]!)!);
    });

    return results[0]!.allowed && results.every((result) => result.allowed)
      ? results[0]!
      : { ...results[0]!, allowed: false, remaining: 0 };
  });
}

export function getRateLimitIdentity({
  request,
  scope,
  userId,
}: {
  request: Request;
  scope: string;
  userId?: string;
}) {
  if (userId) return `${scope}:user:${userId}`;
  const clientAddress = process.env.VERCEL === "1"
    ? normalizeClientAddress(request.headers.get("x-vercel-forwarded-for"))
    : null;
  return `${scope}:client:${clientAddress ?? "shared"}`;
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

function consumeBudget(
  shard: RateLimitShard,
  budget: RateLimitBudget,
  now: number,
  windowMs: number,
): RateLimitResult {
  const currentBucket = shard.entries[budget.entryId];
  if (!currentBucket && Object.keys(shard.entries).length >= MAX_ACTIVE_ENTRIES_PER_SHARD) {
    const resetAt = Math.min(...Object.values(shard.entries).map((entry) => entry.resetAt));
    return {
      allowed: false,
      limit: budget.limit,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }
  const bucket = currentBucket && currentBucket.resetAt > now
    ? currentBucket
    : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  shard.entries[budget.entryId] = bucket;

  return {
    allowed: bucket.count <= budget.limit,
    limit: budget.limit,
    remaining: Math.max(0, budget.limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function createBudget(key: string, limit: number, secret: string): RateLimitBudget {
  const digest = createHmac("sha256", secret).update(key).digest("hex");
  return {
    entryId: digest.slice(2),
    limit,
    shardId: digest.slice(0, 2),
  };
}

function getRateLimitSecret() {
  const secret = process.env.IROGUIDE_RATE_LIMIT_HMAC_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new FirebaseAdminUnavailableError("Request rate limiting is not configured.");
  }
  return secret;
}

function parseShard(value: unknown, now: number): RateLimitShard {
  if (!value || typeof value !== "object" || !("entries" in value) || !value.entries || typeof value.entries !== "object") {
    return { entries: {} };
  }

  const entries: Record<string, RateLimitBucket> = {};
  let entryCount = 0;
  for (const [entryId, bucket] of Object.entries(value.entries)) {
    if (entryCount >= MAX_ACTIVE_ENTRIES_PER_SHARD) break;
    if (!/^[a-f0-9]{62}$/.test(entryId) || !isRateLimitBucket(bucket) || bucket.resetAt <= now) continue;
    entries[entryId] = bucket;
    entryCount += 1;
  }
  return { entries };
}

function isRateLimitBucket(value: unknown): value is RateLimitBucket {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { count?: unknown; resetAt?: unknown };
  return Boolean(
    typeof candidate.count === "number"
    && Number.isSafeInteger(candidate.count)
    && candidate.count >= 0
    && typeof candidate.resetAt === "number"
    && Number.isSafeInteger(candidate.resetAt),
  );
}

function normalizeClientAddress(value: string | null) {
  const address = value?.split(",")[0]?.trim();
  return address && address.length <= 64 && /^[0-9a-f:.]+$/i.test(address) ? address.toLowerCase() : null;
}
