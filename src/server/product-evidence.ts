import "server-only";

import { createHash, createHmac } from "node:crypto";
import {
  buildProductEvidenceSummary,
  productEvidenceEventSchema,
  researchFeedbackSchema,
  type ProductEvidenceEnvironment,
  type ProductEvidenceEvent,
  type ResearchFeedback,
  type StoredProductEvidenceEvent,
  type StoredResearchFeedback,
} from "@/domain/product-evidence";
import { getFirebaseAdminFirestore } from "@/server/firebase-admin";

const EVENT_COLLECTION = "productEvidenceEvents";
const FEEDBACK_COLLECTION = "researchFeedback";
const MAX_REPORT_ROWS = 5_000;
const RAW_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const AGGREGATE_RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;

type EvidenceWriteResult = "duplicate" | "noop" | "recorded" | "sampled-out";

export function getProductEvidenceStatus(env = process.env) {
  const mode = env.IROGUIDE_PRODUCT_EVIDENCE_MODE?.trim().toLowerCase() === "firestore" ? "firestore" : "noop";
  const secretConfigured = (env.IROGUIDE_PRODUCT_EVIDENCE_HMAC_SECRET?.trim().length ?? 0) >= 32;
  return {
    mode,
    ready: mode === "noop" || secretConfigured,
    secretConfigured,
  } as const;
}

export async function recordProductEvidenceEvent({
  event,
  userId,
  env = process.env,
  now = new Date(),
}: {
  event: ProductEvidenceEvent;
  userId: string;
  env?: NodeJS.ProcessEnv;
  now?: Date;
}): Promise<EvidenceWriteResult> {
  const parsed = productEvidenceEventSchema.parse(event);
  const status = getProductEvidenceStatus(env);
  if (status.mode === "noop") return "noop";

  const secret = requireHashSecret(env);
  const sampleRate = getSampleRate(env.IROGUIDE_PRODUCT_EVIDENCE_SAMPLE_RATE);
  if (!shouldSampleProductEvidence(parsed.eventId, sampleRate)) return "sampled-out";

  const accountHash = hmac(secret, userId);
  const dedupeKey = hmac(secret, `${userId}:${parsed.eventId}`);
  const stored: StoredProductEvidenceEvent = {
    ...parsed,
    accountHash,
    consent: "analytics-v1",
    environment: getProductEvidenceEnvironment(env),
    occurredAt: now.toISOString(),
    retentionExpiresAt: new Date(now.getTime() + RAW_EVENT_RETENTION_MS).toISOString(),
    sampleRate,
    schemaVersion: 1,
  };

  try {
    const [db, { FieldValue, Timestamp }] = await Promise.all([getFirebaseAdminFirestore(), import("firebase-admin/firestore")]);
    const eventReference = db.collection(EVENT_COLLECTION).doc(dedupeKey);
    const day = now.toISOString().slice(0, 10);
    const aggregateReference = db.collection("productEvidenceDailyAggregates").doc(`${stored.environment}_${day}_${parsed.name}`);
    await db.runTransaction(async (transaction) => {
      transaction.create(eventReference, {
        ...stored,
        retentionExpiresAt: Timestamp.fromDate(new Date(stored.retentionExpiresAt)),
      });
      transaction.set(aggregateReference, {
        day,
        environment: stored.environment,
        eventCount: FieldValue.increment(1),
        eventName: parsed.name,
        retentionExpiresAt: Timestamp.fromMillis(now.getTime() + AGGREGATE_RETENTION_MS),
        schemaVersion: 1,
        updatedAt: now.toISOString(),
      }, { merge: true });
    });
    return "recorded";
  } catch (error) {
    if (isAlreadyExistsError(error)) return "duplicate";
    throw error;
  }
}

export async function recordResearchFeedback({
  feedback,
  submissionId,
  userId,
  env = process.env,
  now = new Date(),
}: {
  feedback: ResearchFeedback;
  submissionId: string;
  userId: string;
  env?: NodeJS.ProcessEnv;
  now?: Date;
}): Promise<Exclude<EvidenceWriteResult, "sampled-out">> {
  const parsed = researchFeedbackSchema.parse(feedback);
  const status = getProductEvidenceStatus(env);
  if (status.mode === "noop") return "noop";

  const secret = requireHashSecret(env);
  const stored: StoredResearchFeedback = {
    ...parsed,
    accountHash: hmac(secret, userId),
    environment: getProductEvidenceEnvironment(env),
    submittedAt: now.toISOString(),
  };

  try {
    const db = await getFirebaseAdminFirestore();
    await db.collection(FEEDBACK_COLLECTION)
      .doc(hmac(secret, `${userId}:${submissionId}`))
      .create(stored);
    return "recorded";
  } catch (error) {
    if (isAlreadyExistsError(error)) return "duplicate";
    throw error;
  }
}

export async function getProductEvidenceReport({
  days = 30,
  env = process.env,
  now = new Date(),
}: {
  days?: number;
  env?: NodeJS.ProcessEnv;
  now?: Date;
} = {}) {
  const status = getProductEvidenceStatus(env);
  const environment = getProductEvidenceEnvironment(env);
  const boundedDays = Math.min(90, Math.max(1, Math.floor(days)));
  const since = new Date(now.getTime() - boundedDays * 24 * 60 * 60 * 1_000).toISOString();

  if (status.mode === "noop") {
    return {
      collectionMode: "noop" as const,
      environment,
      from: since,
      generatedAt: now.toISOString(),
      partial: false,
      ...buildProductEvidenceSummary([], []),
    };
  }

  requireHashSecret(env);
  const db = await getFirebaseAdminFirestore();
  const [eventSnapshot, feedbackSnapshot] = await Promise.all([
    db.collection(EVENT_COLLECTION).where("occurredAt", ">=", since).orderBy("occurredAt", "desc").limit(MAX_REPORT_ROWS).get(),
    db.collection(FEEDBACK_COLLECTION).where("submittedAt", ">=", since).orderBy("submittedAt", "desc").limit(MAX_REPORT_ROWS).get(),
  ]);
  const events = eventSnapshot.docs
    .map((document) => parseStoredEvent(document.data()))
    .filter((event): event is StoredProductEvidenceEvent => event?.environment === environment);
  const feedback = feedbackSnapshot.docs
    .map((document) => parseStoredFeedback(document.data()))
    .filter((response): response is StoredResearchFeedback => response?.environment === environment);

  return {
    collectionMode: "firestore" as const,
    environment,
    from: since,
    generatedAt: now.toISOString(),
    partial: eventSnapshot.size === MAX_REPORT_ROWS || feedbackSnapshot.size === MAX_REPORT_ROWS,
    ...buildProductEvidenceSummary(events, feedback),
  };
}

export function getProductEvidenceEnvironment(env = process.env): ProductEvidenceEnvironment {
  if (env.NODE_ENV === "test") return "test";
  if (env.VERCEL_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "preview";
  return "development";
}

export function getSampleRate(value: string | undefined) {
  if (!value?.trim()) return 1;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 1;
}

export function shouldSampleProductEvidence(eventId: string, rate: number) {
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  const bucket = createHash("sha256").update(eventId).digest().readUInt32BE(0) / 0x1_0000_0000;
  return bucket < rate;
}

function parseStoredEvent(value: unknown): StoredProductEvidenceEvent | null {
  if (!isRecord(value)) return null;
  const { accountHash, consent, environment, occurredAt, retentionExpiresAt: rawRetentionExpiresAt, sampleRate, schemaVersion, ...event } = value;
  const parsed = productEvidenceEventSchema.safeParse(event);
  const retentionExpiresAt = toIsoTimestamp(rawRetentionExpiresAt);
  if (
    !parsed.success
    || typeof accountHash !== "string"
    || consent !== "analytics-v1"
    || !isEnvironment(environment)
    || typeof occurredAt !== "string"
    || retentionExpiresAt === null
    || typeof sampleRate !== "number"
    || schemaVersion !== 1
  ) return null;
  return { ...parsed.data, accountHash, consent, environment, occurredAt, retentionExpiresAt, sampleRate, schemaVersion };
}

function toIsoTimestamp(value: unknown) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  if (!isRecord(value) || typeof value.toDate !== "function") return null;
  try {
    const date = Reflect.apply(value.toDate, value, []);
    return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}

function parseStoredFeedback(value: unknown): StoredResearchFeedback | null {
  if (!isRecord(value)) return null;
  const { accountHash, environment, submittedAt, ...feedback } = value;
  const parsed = researchFeedbackSchema.safeParse(feedback);
  if (
    !parsed.success
    || typeof accountHash !== "string"
    || !isEnvironment(environment)
    || typeof submittedAt !== "string"
  ) return null;
  return { ...parsed.data, accountHash, environment, submittedAt };
}

function requireHashSecret(env: NodeJS.ProcessEnv) {
  const secret = env.IROGUIDE_PRODUCT_EVIDENCE_HMAC_SECRET?.trim() ?? "";
  if (secret.length < 32) throw new Error("Product evidence HMAC secret must contain at least 32 characters.");
  return secret;
}

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function isAlreadyExistsError(error: unknown) {
  if (!isRecord(error)) return false;
  return error.code === 6 || error.code === "already-exists" || error.code === "ALREADY_EXISTS";
}

function isEnvironment(value: unknown): value is ProductEvidenceEnvironment {
  return value === "development" || value === "preview" || value === "production" || value === "test";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
