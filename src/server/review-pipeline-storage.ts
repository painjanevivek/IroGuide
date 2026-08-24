import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { critiqueRubricVersion } from "@/domain/critique-rubrics";
import {
  canTransitionReviewJob,
  canTransitionReviewUpload,
  reviewJobOutboxSchema,
  reviewJobSchema,
  reviewUploadSessionSchema,
  type ReviewJob,
  type ReviewJobOutbox,
  type ReviewUploadSession,
} from "@/domain/review-pipeline";
import { feedbackModes, reviewBriefSchema, type ReviewCategory } from "@/domain/review";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "./firebase-admin";
import { validateReviewImage } from "./review-image-validator";
import {
  classifyReviewProviderFailure,
  createReviewJobDocumentId,
  getReviewFailureOutcome,
  getReviewOutboxRetryDelayMs,
  hasActiveReviewJobLease,
} from "./review-pipeline-policy";
import { createReview } from "./review-provider";
import { saveReviewForUser } from "./review-storage";

const UPLOAD_TTL_MS = 10 * 60 * 1_000;
const JOB_DEADLINE_MS = 2 * 60 * 1_000;
const ATTEMPT_LEASE_MS = 35 * 1_000;
const OUTBOX_LEASE_MS = 60 * 1_000;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
type FeedbackMode = (typeof feedbackModes)[number];

export class ReviewPipelineError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ReviewPipelineError";
  }
}

export async function createReviewUploadSession({
  contentType,
  userId,
  now = new Date(),
}: {
  contentType: ReviewUploadSession["expectedContentType"];
  userId: string;
  now?: Date;
}) {
  const id = randomUUID();
  const expiresAt = new Date(now.getTime() + UPLOAD_TTL_MS);
  const storagePath = `users/${sanitizePathSegment(userId)}/review-uploads/${id}/source`;
  const session = reviewUploadSessionSchema.parse({
    schemaVersion: 1,
    id,
    userId,
    storagePath,
    state: "authorized",
    maxBytes: MAX_UPLOAD_BYTES,
    expectedContentType: contentType,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nonce: randomBytes(32).toString("hex"),
    contentDigest: null,
    validation: null,
    failureClass: null,
    updatedAt: now.toISOString(),
  });
  const [db, bucket] = await Promise.all([getFirebaseAdminFirestore(), getFirebaseAdminStorageBucket()]);
  const reference = db.collection("reviewUploadSessions").doc(id);
  await reference.create(session);
  try {
    const uploadHeaders = { "Content-Type": contentType, "x-goog-meta-upload-nonce": session.nonce } as const;
    const [uploadUrl] = await bucket.file(storagePath).getSignedUrl({
      action: "write",
      contentType,
      extensionHeaders: { "x-goog-meta-upload-nonce": session.nonce },
      expires: expiresAt,
      version: "v4",
    });
    return { session, uploadHeaders, uploadUrl };
  } catch (error) {
    await reference.delete().catch(() => undefined);
    throw error;
  }
}

export async function finalizeReviewUpload({ id, userId, now = new Date() }: { id: string; userId: string; now?: Date }) {
  const [db, bucket] = await Promise.all([getFirebaseAdminFirestore(), getFirebaseAdminStorageBucket()]);
  const reference = db.collection("reviewUploadSessions").doc(id);
  const snapshot = await reference.get();
  const session = parseUpload(snapshot.data());
  assertOwnedUpload(session, userId);
  if (Date.parse(session.expiresAt) <= now.getTime()) {
    await transitionUpload(reference, session, "expired", now, { failureClass: "expired" });
    throw new ReviewPipelineError("This upload authorization has expired.", 410);
  }
  if (session.state !== "authorized") throw new ReviewPipelineError("This upload cannot be finalized from its current state.", 409);

  let metadata: { contentType?: string; metadata?: Record<string, string | number | boolean | null>; size?: string | number };
  try {
    [metadata] = await bucket.file(session.storagePath).getMetadata();
  } catch {
    throw new ReviewPipelineError("The authorized upload object was not found.", 409);
  }
  const size = Number(metadata.size);
  if (metadata.contentType !== session.expectedContentType
    || metadata.metadata?.["upload-nonce"] !== session.nonce
    || !Number.isSafeInteger(size)
    || size <= 0
    || size > session.maxBytes) {
    await transitionUpload(reference, session, "rejected", now, { failureClass: "invalid-image" });
    await bucket.file(session.storagePath).delete({ ignoreNotFound: true });
    throw new ReviewPipelineError("The uploaded object does not match its authorization.", 400);
  }

  const outboxId = randomUUID();
  const outbox = reviewJobOutboxSchema.parse({
    schemaVersion: 1,
    id: outboxId,
    userId,
    targetId: id,
    eventType: "validate-upload",
    deliveryState: "pending",
    attemptCount: 0,
    nextAttemptAt: now.toISOString(),
    leaseOwner: null,
    leaseExpiresAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  await db.runTransaction(async (transaction) => {
    const current = parseUpload((await transaction.get(reference)).data());
    assertOwnedUpload(current, userId);
    if (current.state !== "authorized") throw new ReviewPipelineError("This upload was already finalized.", 409);
    transaction.update(reference, { state: "uploaded", updatedAt: now.toISOString() });
    transaction.create(db.collection("reviewJobOutbox").doc(outboxId), outbox);
  });
  return { id, state: "uploaded" as const };
}

export async function validateStoredReviewUpload(id: string, now = new Date()) {
  const [db, bucket] = await Promise.all([getFirebaseAdminFirestore(), getFirebaseAdminStorageBucket()]);
  const reference = db.collection("reviewUploadSessions").doc(id);
  const snapshot = await reference.get();
  const session = parseUpload(snapshot.data());
  if (session.state === "validated" && session.validation) return session.validation;
  if (session.state !== "uploaded") throw new ReviewPipelineError("Upload validation is not pending.", 409);
  try {
    const [bytes] = await bucket.file(session.storagePath).download();
    const validation = await validateReviewImage(bytes, session.expectedContentType, now);
    await transitionUpload(reference, session, "validated", now, { contentDigest: validation.contentDigest, validation });
    return validation;
  } catch (error) {
    await transitionUpload(reference, session, "rejected", now, { failureClass: "invalid-image" });
    await bucket.file(session.storagePath).delete({ ignoreNotFound: true });
    if (error instanceof ReviewPipelineError) throw error;
    throw new ReviewPipelineError("Upload validation failed closed.", 400);
  }
}

export async function revokeReviewUpload({ id, userId, now = new Date() }: { id: string; userId: string; now?: Date }) {
  const [db, bucket] = await Promise.all([getFirebaseAdminFirestore(), getFirebaseAdminStorageBucket()]);
  const reference = db.collection("reviewUploadSessions").doc(id);
  const session = parseUpload((await reference.get()).data());
  assertOwnedUpload(session, userId);
  if (!canTransitionReviewUpload(session.state, "rejected")) throw new ReviewPipelineError("This upload can no longer be revoked.", 409);
  await transitionUpload(reference, session, "rejected", now, { failureClass: "revoked" });
  await bucket.file(session.storagePath).delete({ ignoreNotFound: true });
  return { deleted: true };
}

export async function getOwnedReviewUpload(id: string, userId: string) {
  const db = await getFirebaseAdminFirestore();
  const session = parseUpload((await db.collection("reviewUploadSessions").doc(id).get()).data());
  assertOwnedUpload(session, userId);
  return {
    id: session.id,
    state: session.state,
    expiresAt: session.expiresAt,
    failureClass: session.failureClass,
    validation: session.validation
      ? { bytes: session.validation.bytes, detectedFormat: session.validation.detectedFormat, height: session.validation.height, width: session.validation.width }
      : null,
    updatedAt: session.updatedAt,
  };
}

export async function createReviewJob({
  brief,
  category,
  idempotencyKey,
  mode,
  uploadSessionId,
  userId,
  now = new Date(),
}: {
  brief: unknown;
  category: ReviewCategory;
  idempotencyKey: string;
  mode: FeedbackMode;
  uploadSessionId: string;
  userId: string;
  now?: Date;
}) {
  const parsedBrief = reviewBriefSchema.parse(brief);
  const db = await getFirebaseAdminFirestore();
  const uploadReference = db.collection("reviewUploadSessions").doc(uploadSessionId);
  const jobDocumentId = createReviewJobDocumentId(userId, idempotencyKey);
  const jobReference = db.collection("reviewJobs").doc(jobDocumentId);
  const requestDigest = createHash("sha256").update(JSON.stringify({ brief: parsedBrief, category, mode, uploadSessionId })).digest("hex");
  const id = randomUUID();
  const outboxId = randomUUID();
  const job = reviewJobSchema.parse({
    schemaVersion: 1,
    id,
    userId,
    uploadSessionId,
    idempotencyKey,
    requestDigest,
    status: "accepted",
    attempt: 0,
    attempts: [],
    category,
    mode,
    brief: parsedBrief,
    provider: process.env.IROGUIDE_REVIEW_PROVIDER?.trim() || "unavailable",
    model: process.env.OPENROUTER_MODEL?.trim() || "unconfigured",
    providerContractVersion: "review-v1",
    rubricVersion: critiqueRubricVersion,
    deadlineAt: new Date(now.getTime() + JOB_DEADLINE_MS).toISOString(),
    resultDocumentId: null,
    failureClass: null,
    leaseOwner: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  const outbox = reviewJobOutboxSchema.parse({
    schemaVersion: 1,
    id: outboxId,
    userId,
    targetId: id,
    eventType: "run-review",
    deliveryState: "pending",
    attemptCount: 0,
    nextAttemptAt: now.toISOString(),
    leaseOwner: null,
    leaseExpiresAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  return db.runTransaction(async (transaction) => {
    const [uploadSnapshot, existingSnapshot] = await Promise.all([
      transaction.get(uploadReference),
      transaction.get(jobReference),
    ]);
    const upload = parseUpload(uploadSnapshot.data());
    assertOwnedUpload(upload, userId);
    if (upload.state !== "validated") throw new ReviewPipelineError("The review upload is not validated.", 409);
    if (existingSnapshot.exists) {
      const existing = parseJob(existingSnapshot.data());
      if (existing.requestDigest !== requestDigest) throw new ReviewPipelineError("Idempotency key conflicts with another review request.", 409);
      return { created: false, job: existing };
    }
    transaction.create(jobReference, job);
    transaction.create(db.collection("reviewJobOutbox").doc(outboxId), outbox);
    transaction.update(uploadReference, { state: "consumed", updatedAt: now.toISOString() });
    return { created: true, job };
  });
}

export async function getOwnedReviewJob(id: string, userId: string) {
  const db = await getFirebaseAdminFirestore();
  const snapshot = await db.collection("reviewJobs").where("id", "==", id).limit(1).get();
  const job = snapshot.empty ? null : parseJob(snapshot.docs[0]?.data());
  if (!job || job.userId !== userId) throw new ReviewPipelineError("Review job was not found.", 404);
  return toReviewJobProjection(job);
}

export async function cancelOwnedReviewJob(id: string, userId: string, now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const snapshot = await db.collection("reviewJobs").where("id", "==", id).limit(1).get();
  const document = snapshot.docs[0];
  const job = document ? parseJob(document.data()) : null;
  if (!job || job.userId !== userId) throw new ReviewPipelineError("Review job was not found.", 404);
  if (!canTransitionReviewJob(job.status, "cancelled")) throw new ReviewPipelineError("Review job can no longer be cancelled.", 409);
  await db.runTransaction(async (transaction) => {
    const current = parseJob((await transaction.get(document.ref)).data());
    if (current.userId !== userId) throw new ReviewPipelineError("Review job was not found.", 404);
    if (!canTransitionReviewJob(current.status, "cancelled")) throw new ReviewPipelineError("Review job can no longer be cancelled.", 409);
    const finishedAt = now.toISOString();
    const attempts = current.attempts.map((attempt, index) => index === current.attempts.length - 1 && !attempt.finishedAt
      ? { ...attempt, finishedAt, failureClass: "cancelled" as const }
      : attempt);
    transaction.update(document.ref, { attempts, status: "cancelled", failureClass: "cancelled", leaseOwner: null, updatedAt: finishedAt });
  });
  return { cancelled: true };
}

export async function runReviewJob(id: string, workerId: string, now = new Date()) {
  const [db, bucket] = await Promise.all([getFirebaseAdminFirestore(), getFirebaseAdminStorageBucket()]);
  const snapshot = await db.collection("reviewJobs").where("id", "==", id).limit(1).get();
  const document = snapshot.docs[0];
  if (!document) throw new ReviewPipelineError("Review job was not found.", 404);
  const leased = await db.runTransaction(async (transaction) => {
    const job = parseJob((await transaction.get(document.ref)).data());
    if (job.status !== "accepted" && job.status !== "failed-retryable") {
      if (job.status === "succeeded") return job;
      throw new ReviewPipelineError("Review job is not runnable.", 409);
    }
    if (job.attempt >= 3) throw new ReviewPipelineError("Review job exhausted its attempts.", 409);
    const startedAt = now.toISOString();
    const leaseExpiresAt = new Date(Math.min(Date.parse(job.deadlineAt), now.getTime() + ATTEMPT_LEASE_MS)).toISOString();
    const next = reviewJobSchema.parse({
      ...job,
      status: "running",
      leaseOwner: workerId,
      attempt: job.attempt + 1,
      attempts: [...job.attempts, { attempt: job.attempt + 1, startedAt, finishedAt: null, leaseExpiresAt, failureClass: null, workerId }],
      updatedAt: startedAt,
    });
    transaction.set(document.ref, next);
    return next;
  });
  if (leased.status === "succeeded") return toReviewJobProjection(leased);
  if (Date.parse(leased.deadlineAt) <= now.getTime()) {
    await failLeasedJob(document.ref, leased, workerId, "deadline", now);
    throw new ReviewPipelineError("Review job exceeded its shared deadline.", 504);
  }

  const uploadSnapshot = await db.collection("reviewUploadSessions").doc(leased.uploadSessionId).get();
  const upload = parseUpload(uploadSnapshot.data());
  if (upload.userId !== leased.userId || upload.state !== "consumed" || !upload.validation) {
    await failLeasedJob(document.ref, leased, workerId, "policy", now);
    throw new ReviewPipelineError("Review job upload evidence is invalid.", 409);
  }
  let bytes: Buffer;
  try {
    [bytes] = await bucket.file(upload.storagePath).download();
  } catch {
    await failLeasedJob(document.ref, leased, workerId, "policy", new Date());
    throw new ReviewPipelineError("Validated review upload is no longer available.", 409);
  }
  let review;
  try {
    review = await createReview({
      category: leased.category,
      mode: leased.mode,
      brief: leased.brief,
      file: {
        name: `review-upload.${upload.validation.detectedFormat === "jpeg" ? "jpg" : upload.validation.detectedFormat}`,
        size: bytes.length,
        type: upload.expectedContentType,
      },
      image: { dataBase64: bytes.toString("base64"), mimeType: upload.expectedContentType },
    });
  } catch (error) {
    const failureClass = classifyReviewProviderFailure(error);
    await failLeasedJob(document.ref, leased, workerId, failureClass, new Date());
    throw new ReviewPipelineError("Review provider attempt failed.", failureClass === "deadline" ? 504 : 503);
  }

  try {
    await assertLeaseStillActive(document.ref, leased.attempt, workerId);
    const saved = await saveReviewForUser({
      category: leased.category,
      documentId: `pipeline_${leased.id}`,
      review,
      sourceImage: {
        file: {
          name: `review-upload.${upload.validation.detectedFormat === "jpeg" ? "jpg" : upload.validation.detectedFormat}`,
          size: bytes.length,
          type: upload.expectedContentType,
        },
        image: { dataBase64: bytes.toString("base64"), mimeType: upload.expectedContentType },
      },
      userId: leased.userId,
    });
    const finishedAt = new Date().toISOString();
    await db.runTransaction(async (transaction) => {
      const current = parseJob((await transaction.get(document.ref)).data());
      assertActiveLease(current, leased.attempt, workerId);
      const attempts = current.attempts.map((attempt, index) => index === current.attempts.length - 1 ? { ...attempt, finishedAt } : attempt);
      transaction.update(document.ref, {
        status: "succeeded",
        resultDocumentId: saved.id,
        failureClass: null,
        leaseOwner: null,
        attempts,
        updatedAt: finishedAt,
      });
    });
    await bucket.file(upload.storagePath).delete({ ignoreNotFound: true });
    return { ...toReviewJobProjection(leased), status: "succeeded" as const, resultDocumentId: saved.id, updatedAt: finishedAt, workerId };
  } catch {
    await failLeasedJob(document.ref, leased, workerId, "result-save", new Date());
    throw new ReviewPipelineError("Review result could not be saved.", 503);
  }
}

export async function reconcileReviewPipeline(now = new Date()) {
  const [db, bucket] = await Promise.all([getFirebaseAdminFirestore(), getFirebaseAdminStorageBucket()]);
  const expired = await db.collection("reviewUploadSessions").where("expiresAt", "<=", now.toISOString()).limit(100).get();
  let uploadsExpired = 0;
  for (const document of expired.docs) {
    const session = parseUpload(document.data());
    if (!canTransitionReviewUpload(session.state, "expired")) continue;
    await document.ref.update({ state: "expired", failureClass: "expired", updatedAt: now.toISOString() });
    await bucket.file(session.storagePath).delete({ ignoreNotFound: true });
    uploadsExpired += 1;
  }
  const staleJobs = await db.collection("reviewJobs").where("status", "==", "running").limit(100).get();
  let jobsRecovered = 0;
  for (const document of staleJobs.docs) {
    const job = parseJob(document.data());
    const latest = job.attempts.at(-1);
    if (!latest || Date.parse(latest.leaseExpiresAt) > now.getTime()) continue;
    const finishedAt = now.toISOString();
    const attempts = job.attempts.map((attempt, index) => index === job.attempts.length - 1
      ? { ...attempt, finishedAt, failureClass: "provider-unavailable" as const }
      : attempt);
    const status = job.attempt < 3 && Date.parse(job.deadlineAt) > now.getTime() ? "failed-retryable" : "failed-permanent";
    await document.ref.update({
      status,
      failureClass: "provider-unavailable",
      leaseOwner: null,
      attempts,
      updatedAt: finishedAt,
    });
    jobsRecovered += 1;
  }
  const activeUploads = await db.collection("reviewUploadSessions").where("state", "in", ["uploaded", "validated"]).limit(100).get();
  let missingObjectsRejected = 0;
  for (const document of activeUploads.docs) {
    const session = parseUpload(document.data());
    const [exists] = await bucket.file(session.storagePath).exists();
    if (exists) continue;
    await document.ref.update({ state: "rejected", failureClass: "missing-object", updatedAt: now.toISOString() });
    missingObjectsRejected += 1;
  }
  const consumedUploads = await db.collection("reviewUploadSessions").where("state", "==", "consumed").limit(100).get();
  let consumedObjectsCleaned = 0;
  for (const document of consumedUploads.docs) {
    const session = parseUpload(document.data());
    const jobs = await db.collection("reviewJobs").where("uploadSessionId", "==", session.id).limit(1).get();
    if (jobs.empty) continue;
    const job = parseJob(jobs.docs[0]?.data());
    if (job.status !== "succeeded" && job.status !== "failed-permanent" && job.status !== "cancelled") continue;
    const [exists] = await bucket.file(session.storagePath).exists();
    if (!exists) continue;
    await bucket.file(session.storagePath).delete({ ignoreNotFound: true });
    consumedObjectsCleaned += 1;
  }
  return { consumedObjectsCleaned, jobsRecovered, missingObjectsRejected, uploadsExpired };
}

export async function dispatchNextReviewPipelineEvent(workerId: string, now = new Date()) {
  const claimed = await claimNextOutboxEvent(workerId, now);
  if (!claimed) return { dispatched: false as const };
  try {
    if (claimed.event.eventType === "validate-upload") {
      await validateStoredReviewUpload(claimed.event.targetId);
    } else if (claimed.event.eventType === "run-review") {
      await runReviewJob(claimed.event.targetId, workerId);
    } else {
      await reconcileReviewPipeline();
    }
    await finishOutboxDelivery(claimed.reference, claimed.event, workerId, "delivered", new Date());
    return { dispatched: true as const, eventId: claimed.event.id, eventType: claimed.event.eventType, delivered: true as const };
  } catch {
    const retry = await isOutboxTargetRetryable(claimed.event);
    await finishOutboxDelivery(claimed.reference, claimed.event, workerId, retry ? "retry" : "failed", new Date());
    return { dispatched: true as const, eventId: claimed.event.id, eventType: claimed.event.eventType, delivered: false as const, retryScheduled: retry };
  }
}

export async function getReviewPipelineDiagnostics(now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const [uploads, jobs, outbox] = await Promise.all([
    db.collection("reviewUploadSessions").limit(500).get(),
    db.collection("reviewJobs").limit(500).get(),
    db.collection("reviewJobOutbox").limit(500).get(),
  ]);
  const parsedJobs = jobs.docs.map((document) => parseJob(document.data()));
  const parsedUploads = uploads.docs.map((document) => parseUpload(document.data()));
  const parsedOutbox = outbox.docs.map((document) => reviewJobOutboxSchema.parse(document.data()));
  const pendingOutbox = parsedOutbox.filter((item) => item.deliveryState === "pending");
  const terminalJobs = parsedJobs.filter((job) => job.status === "succeeded" || job.status === "failed-permanent" || job.status === "cancelled");
  const knownTargetIds = new Set([...parsedUploads.map((upload) => upload.id), ...parsedJobs.map((job) => job.id)]);
  return {
    sampled: uploads.size === 500 || jobs.size === 500 || outbox.size === 500,
    uploadCount: uploads.size,
    jobCount: jobs.size,
    pendingOutboxCount: pendingOutbox.length,
    leasedOutboxCount: parsedOutbox.filter((item) => item.deliveryState === "leased").length,
    failedOutboxCount: parsedOutbox.filter((item) => item.deliveryState === "failed").length,
    orphanOutboxCount: parsedOutbox.filter((item) => !knownTargetIds.has(item.targetId)).length,
    cleanupBacklogCount: parsedUploads.filter((upload) => upload.state === "expired" || upload.state === "rejected").length,
    permanentFailureCount: parsedJobs.filter((job) => job.status === "failed-permanent").length,
    retryableFailureCount: parsedJobs.filter((job) => job.status === "failed-retryable").length,
    oldestPendingAgeMs: pendingOutbox.reduce((maximum, item) => Math.max(maximum, now.getTime() - Date.parse(item.createdAt)), 0),
    maximumAttempt: parsedJobs.reduce((maximum, job) => Math.max(maximum, job.attempt), 0),
    averageTerminalLatencyMs: terminalJobs.length === 0 ? 0 : Math.round(terminalJobs.reduce(
      (total, job) => total + Math.max(0, Date.parse(job.updatedAt) - Date.parse(job.createdAt)),
      0,
    ) / terminalJobs.length),
  };
}

async function claimNextOutboxEvent(workerId: string, now: Date) {
  const db = await getFirebaseAdminFirestore();
  const snapshot = await db.collection("reviewJobOutbox").limit(100).get();
  const candidate = snapshot.docs
    .map((document) => ({ document, event: reviewJobOutboxSchema.parse(document.data()) }))
    .filter(({ event }) => (event.deliveryState === "pending" && Date.parse(event.nextAttemptAt) <= now.getTime())
      || (event.deliveryState === "leased" && event.leaseExpiresAt !== null && Date.parse(event.leaseExpiresAt) <= now.getTime()))
    .sort((left, right) => Date.parse(left.event.nextAttemptAt) - Date.parse(right.event.nextAttemptAt))[0];
  if (!candidate) return null;
  return db.runTransaction(async (transaction) => {
    const current = reviewJobOutboxSchema.parse((await transaction.get(candidate.document.ref)).data());
    const claimable = (current.deliveryState === "pending" && Date.parse(current.nextAttemptAt) <= now.getTime())
      || (current.deliveryState === "leased" && current.leaseExpiresAt !== null && Date.parse(current.leaseExpiresAt) <= now.getTime());
    if (!claimable || current.attemptCount >= 12) return null;
    const event = reviewJobOutboxSchema.parse({
      ...current,
      deliveryState: "leased",
      attemptCount: current.attemptCount + 1,
      leaseOwner: workerId,
      leaseExpiresAt: new Date(now.getTime() + OUTBOX_LEASE_MS).toISOString(),
      updatedAt: now.toISOString(),
    });
    transaction.set(candidate.document.ref, event);
    return { event, reference: candidate.document.ref };
  });
}

async function finishOutboxDelivery(
  reference: FirebaseFirestore.DocumentReference,
  claimed: ReviewJobOutbox,
  workerId: string,
  disposition: "delivered" | "retry" | "failed",
  now: Date,
) {
  const db = await getFirebaseAdminFirestore();
  await db.runTransaction(async (transaction) => {
    const current = reviewJobOutboxSchema.parse((await transaction.get(reference)).data());
    if (current.deliveryState !== "leased" || current.leaseOwner !== workerId || current.attemptCount !== claimed.attemptCount) return;
    const retry = disposition === "retry" && current.attemptCount < 12;
    transaction.update(reference, {
      deliveryState: disposition === "delivered" ? "delivered" : retry ? "pending" : "failed",
      leaseOwner: null,
      leaseExpiresAt: null,
      nextAttemptAt: retry
        ? new Date(now.getTime() + getReviewOutboxRetryDelayMs(current.attemptCount)).toISOString()
        : current.nextAttemptAt,
      updatedAt: now.toISOString(),
    });
  });
}

async function isOutboxTargetRetryable(event: ReviewJobOutbox) {
  if (event.eventType === "run-review") {
    const db = await getFirebaseAdminFirestore();
    const snapshot = await db.collection("reviewJobs").where("id", "==", event.targetId).limit(1).get();
    return !snapshot.empty && parseJob(snapshot.docs[0]?.data()).status === "failed-retryable";
  }
  if (event.eventType === "validate-upload") {
    const db = await getFirebaseAdminFirestore();
    const snapshot = await db.collection("reviewUploadSessions").doc(event.targetId).get();
    return snapshot.exists && parseUpload(snapshot.data()).state === "uploaded";
  }
  return false;
}

function toReviewJobProjection(job: ReviewJob) {
  return {
    id: job.id,
    status: job.status,
    attempt: job.attempt,
    failureClass: job.failureClass,
    resultDocumentId: job.resultDocumentId,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

async function transitionUpload(reference: FirebaseFirestore.DocumentReference, session: ReviewUploadSession, state: ReviewUploadSession["state"], now: Date, patch: Record<string, unknown>) {
  if (!canTransitionReviewUpload(session.state, state)) throw new ReviewPipelineError("Invalid review upload transition.", 409);
  await reference.update({ ...patch, state, updatedAt: now.toISOString() });
}

function parseUpload(value: unknown) {
  if (!value) throw new ReviewPipelineError("Review upload was not found.", 404);
  return reviewUploadSessionSchema.parse(value);
}

function parseJob(value: unknown) {
  if (!value) throw new ReviewPipelineError("Review job was not found.", 404);
  return reviewJobSchema.parse(value);
}

function assertOwnedUpload(session: ReviewUploadSession, userId: string) {
  if (session.userId !== userId) throw new ReviewPipelineError("Review upload was not found.", 404);
}

function sanitizePathSegment(value: string) {
  return value.replaceAll("/", "_").replace(/[^\w.-]/g, "_").slice(0, 128) || "user";
}

async function failLeasedJob(
  reference: FirebaseFirestore.DocumentReference,
  job: ReviewJob,
  workerId: string,
  failureClass: ReviewJob["failureClass"],
  now: Date,
) {
  const finishedAt = now.toISOString();
  const db = await getFirebaseAdminFirestore();
  await db.runTransaction(async (transaction) => {
    const current = parseJob((await transaction.get(reference)).data());
    assertActiveLease(current, job.attempt, workerId);
    const status = getReviewFailureOutcome({ attempt: current.attempt, deadlineAt: current.deadlineAt, failureClass, now });
    const attempts = current.attempts.map((attempt, index) => index === current.attempts.length - 1
      ? { ...attempt, finishedAt, failureClass }
      : attempt);
    transaction.update(reference, { status, failureClass, leaseOwner: null, attempts, updatedAt: finishedAt });
  });
}

function assertActiveLease(job: ReviewJob, attempt: number, workerId: string) {
  if (!hasActiveReviewJobLease(job, attempt, workerId)) {
    throw new ReviewPipelineError("Review job lease is no longer active.", 409);
  }
}

async function assertLeaseStillActive(reference: FirebaseFirestore.DocumentReference, attempt: number, workerId: string) {
  const job = parseJob((await reference.get()).data());
  assertActiveLease(job, attempt, workerId);
}
