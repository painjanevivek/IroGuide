import "server-only";

import { Buffer } from "node:buffer";
import { accountExportEnvelopeSchema } from "@/domain/account-export";
import { assertAccountDeletionUnlocked } from "./account-deletion-lock";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "./firebase-admin";
import { getAccountExperienceBundle, listDesignBriefs, listSelfReviews, toPublicActivationRecord } from "./product-activation-storage";

const MAX_EXPORT_ROWS = 200;
const MAX_EXPORT_BYTES = 2 * 1024 * 1024;
const prohibitedKeys = new Set([
  "abuseRecords", "accessToken", "internalSecurity", "operatorNotes", "ownerId", "providerPayload",
  "rawProviderData", "recentMutationIds", "securityRecords", "signedUrl", "sourceImage", "storagePath",
  "token", "uid", "userId",
].map((key) => key.toLowerCase()));
const prohibitedKeyFragments = ["abuse", "accesstoken", "internalsecurity", "operatornote", "providerpayload", "rawprovider", "refreshtoken", "securityrecord", "signedurl", "sourceimage", "storagepath"];

export class AccountExportTooLargeError extends Error {
  readonly status = 413;
  constructor(message = "Your account export is larger than the synchronous safety limit. Contact support for a bounded export.") { super(message); }
}

export async function buildAccountExport(userId: string, now = new Date()) {
  await assertAccountDeletionUnlocked(userId);
  const db = await getFirebaseAdminFirestore();
  const [authUser, bundle, selfReviews, briefs, reviews, reviewDrafts, comparisons, messages, caseStudies] = await Promise.all([
    (await getFirebaseAdminAuth()).getUser(userId),
    getAccountExperienceBundle(userId),
    listSelfReviews(userId),
    listDesignBriefs(userId),
    readOwnedCollection(db, "reviews", userId),
    readOwnedCollection(db, "reviewDrafts", userId),
    readOwnedCollection(db, "reviewComparisons", userId),
    readOwnedCollection(db, "reviewFollowUps", userId),
    readOwnedCollection(db, "privateCaseStudies", userId),
  ]);
  const envelope = accountExportEnvelopeSchema.parse({
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    profile: {
      createdAt: authUser.metadata.creationTime ?? null,
      displayName: authUser.displayName ?? null,
      email: authUser.email ?? null,
      emailVerified: authUser.emailVerified,
    },
    learning: sanitizeExportValue({
      experience: toPublicActivationRecord(bundle.experience),
      sampleProgress: bundle.sampleProgress.map(toPublicActivationRecord),
      selfReviews: selfReviews.map(toPublicActivationRecord),
      briefs: briefs.map(toPublicActivationRecord),
      accessInterest: bundle.accessInterest ? toPublicActivationRecord(bundle.accessInterest) : null,
    }),
    reviews: reviews.map((record, index) => ({ exportId: `review-${index + 1}`, ...sanitizeRecord(record) })),
    reviewDrafts: reviewDrafts.map((record, index) => ({ exportId: `review-draft-${index + 1}`, ...sanitizeRecord(record) })),
    comparisons: comparisons.map((record, index) => ({ exportId: `comparison-${index + 1}`, ...sanitizeRecord(record) })),
    messages: messages.map((record, index) => ({ exportId: `message-${index + 1}`, ...sanitizeRecord(record) })),
    caseStudies: caseStudies.map((record, index) => ({ exportId: `case-study-${index + 1}`, ...sanitizeRecord(record) })),
  });
  if (Buffer.byteLength(JSON.stringify(envelope), "utf8") > MAX_EXPORT_BYTES) throw new AccountExportTooLargeError();
  return envelope;
}

async function readOwnedCollection(db: Awaited<ReturnType<typeof getFirebaseAdminFirestore>>, collection: string, userId: string) {
  const snapshot = await db.collection(collection).where("userId", "==", userId).limit(MAX_EXPORT_ROWS + 1).get();
  if (snapshot.size > MAX_EXPORT_ROWS) throw new AccountExportTooLargeError(`${collection} exceeds the synchronous export row limit.`);
  return snapshot.docs.map((document) => document.data());
}

function sanitizeRecord(value: Record<string, unknown>) {
  const sanitized = sanitizeExportValue(value);
  return typeof sanitized === "object" && sanitized !== null && !Array.isArray(sanitized) ? sanitized : {};
}

export function sanitizeExportValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeExportValue);
  if (typeof value !== "object" || value === null) return value;
  if (value instanceof Date) return value.toISOString();
  if ("toDate" in value && typeof value.toDate === "function") {
    try {
      const date = Reflect.apply(value.toDate, value, []);
      if (date instanceof Date && Number.isFinite(date.getTime())) return date.toISOString();
    } catch {
      return null;
    }
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (prohibitedKeys.has(normalizedKey) || prohibitedKeyFragments.some((fragment) => normalizedKey.includes(fragment)) || normalizedKey.endsWith("token")) continue;
    output[key] = sanitizeExportValue(nested);
  }
  return output;
}
