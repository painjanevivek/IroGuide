import "server-only";

import { communityOutboxSchema, communityReportRecordSchema, type CommunityPublicProjection } from "@/domain/community-safety";
import { getCommunityCounterDiagnostics, reconcileCommunityCounters } from "./community-counter-storage";
import { COMMUNITY_COLLECTIONS } from "./community-records";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const OUTBOX_LEASE_MS = 60_000;
const MAX_OUTBOX_ATTEMPTS = 12;

export async function dispatchNextCommunityEvent(workerId: string, now = new Date()) {
  const claimed = await claimCommunityEvent(workerId, now);
  if (!claimed) return { dispatched: false as const };
  try {
    if (claimed.event.eventType === "delete-derivatives") {
      await deleteCommunityDerivatives(claimed.event.targetId, now, { excludeOutboxId: claimed.event.id });
    }
    if (claimed.event.eventType === "hide-projection") await hideProjection(claimed.event.targetId, now);
    if (claimed.event.eventType === "repair-counters") await reconcileCommunityCounters({ postId: claimed.event.targetId, now });
    await finishCommunityEvent(claimed.reference, claimed.event.attempt, workerId, true, new Date());
    return { delivered: true as const, dispatched: true as const, eventId: claimed.event.id };
  } catch {
    await finishCommunityEvent(claimed.reference, claimed.event.attempt, workerId, false, new Date());
    return { delivered: false as const, dispatched: true as const, eventId: claimed.event.id };
  }
}

export async function getCommunityOperationsDiagnostics(now = new Date()) {
  const db = await getFirebaseAdminFirestore();
  const [reports, outbox, accountModeration, counters] = await Promise.all([
    db.collection(COMMUNITY_COLLECTIONS.reports).limit(500).get(),
    db.collection(COMMUNITY_COLLECTIONS.outbox).limit(500).get(),
    db.collection(COMMUNITY_COLLECTIONS.accountModeration).limit(500).get(),
    getCommunityCounterDiagnostics(),
  ]);
  const parsedReports = reports.docs.flatMap((document) => {
    const parsed = communityReportRecordSchema.safeParse(document.data());
    return parsed.success ? [parsed.data] : [];
  });
  const parsedOutbox = outbox.docs.flatMap((document) => {
    const parsed = communityOutboxSchema.safeParse(document.data());
    return parsed.success ? [parsed.data] : [];
  });
  const queuedReports = parsedReports.filter((report) => report.status === "queued" || report.status === "reviewing");
  const deletionBacklog = parsedOutbox.filter((event) => event.eventType === "delete-derivatives" && event.state !== "delivered");
  const abuseAccountCount = accountModeration.docs.filter((document) => ["restricted", "banned"].includes(String(document.data().state))).length;
  const oldestReportAgeMs = oldestAge(queuedReports.map((report) => report.queueEnteredAt), now);
  const oldestDeletionAgeMs = oldestAge(deletionBacklog.map((event) => event.createdAt), now);
  return {
    alerts: {
      abuseSpike: abuseAccountCount >= 10,
      counterDrift: counters.maximumDrift > 2,
      deletionBacklog: oldestDeletionAgeMs > 15 * 60_000,
      moderationBacklog: queuedReports.length >= 25 || oldestReportAgeMs > 60 * 60_000,
      privacyReport: parsedReports.some((report) => report.reason === "privacy" && report.status !== "resolved" && report.status !== "dismissed"),
    },
    abuseAccountCount,
    counters,
    deletionBacklogCount: deletionBacklog.length,
    moderationBacklogCount: queuedReports.length,
    oldestDeletionAgeMs,
    oldestReportAgeMs,
    privacyReportCount: parsedReports.filter((report) => report.reason === "privacy" && report.status !== "resolved" && report.status !== "dismissed").length,
    sampled: reports.size === 500 || outbox.size === 500 || accountModeration.size === 500,
  };
}

export function runSyntheticCommunityIncidentExercise({
  blockedAuthorId,
  projections,
  publicReadEnabled,
}: {
  blockedAuthorId: string;
  projections: Array<CommunityPublicProjection & { ownerId?: string }>;
  publicReadEnabled: boolean;
}) {
  const discoverable = publicReadEnabled
    ? projections.filter((projection) => projection.ownerId !== blockedAuthorId)
    : [];
  return {
    blockedContentHidden: discoverable.every((projection) => projection.ownerId !== blockedAuthorId),
    capabilityClosed: !publicReadEnabled,
    discoverableCount: discoverable.length,
    exerciseOnly: true as const,
  };
}

async function claimCommunityEvent(workerId: string, now: Date) {
  const db = await getFirebaseAdminFirestore();
  await failExpiredTerminalLeases(db, now);
  const [pending, expiredLeases] = await Promise.all([
    db.collection(COMMUNITY_COLLECTIONS.outbox)
      .where("state", "==", "pending")
      .where("nextAttemptAt", "<=", now.toISOString())
      .orderBy("nextAttemptAt", "asc")
      .limit(25)
      .get(),
    db.collection(COMMUNITY_COLLECTIONS.outbox)
      .where("state", "==", "leased")
      .where("leaseExpiresAt", "<=", now.toISOString())
      .orderBy("leaseExpiresAt", "asc")
      .limit(25)
      .get(),
  ]);
  const candidate = [...pending.docs, ...expiredLeases.docs]
    .map((document) => ({ document, parsed: communityOutboxSchema.safeParse(document.data()) }))
    .flatMap((item) => item.parsed.success ? [{ document: item.document, event: item.parsed.data }] : [])
    .filter(({ event }) => (event.state === "pending" && Date.parse(event.nextAttemptAt) <= now.getTime())
      || (event.state === "leased" && event.leaseExpiresAt !== null && Date.parse(event.leaseExpiresAt) <= now.getTime()))
    .filter(({ event }) => event.attempt < MAX_OUTBOX_ATTEMPTS)
    .sort((left, right) => left.event.nextAttemptAt.localeCompare(right.event.nextAttemptAt))[0];
  if (!candidate) return null;
  return db.runTransaction(async (transaction) => {
    const current = communityOutboxSchema.safeParse((await transaction.get(candidate.document.ref)).data());
    if (!current.success) return null;
    const claimable = (current.data.state === "pending" && Date.parse(current.data.nextAttemptAt) <= now.getTime())
      || (current.data.state === "leased" && current.data.leaseExpiresAt !== null && Date.parse(current.data.leaseExpiresAt) <= now.getTime());
    if (!claimable || current.data.attempt >= MAX_OUTBOX_ATTEMPTS) return null;
    const event = communityOutboxSchema.parse({
      ...current.data,
      state: "leased",
      attempt: current.data.attempt + 1,
      leaseOwner: workerId,
      leaseExpiresAt: new Date(now.getTime() + OUTBOX_LEASE_MS).toISOString(),
      updatedAt: now.toISOString(),
    });
    transaction.set(candidate.document.ref, event);
    return { event, reference: candidate.document.ref };
  });
}

async function failExpiredTerminalLeases(db: FirebaseFirestore.Firestore, now: Date) {
  while (true) {
    const snapshot = await db.collection(COMMUNITY_COLLECTIONS.outbox)
      .where("state", "==", "leased")
      .where("attempt", "==", MAX_OUTBOX_ATTEMPTS)
      .where("leaseExpiresAt", "<=", now.toISOString())
      .orderBy("leaseExpiresAt", "asc")
      .limit(400)
      .get();
    if (snapshot.empty) return;
    const batch = db.batch();
    for (const document of snapshot.docs) {
      batch.update(document.ref, {
        state: "failed",
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: now.toISOString(),
      });
    }
    await batch.commit();
    if (snapshot.size < 400) return;
  }
}

async function finishCommunityEvent(reference: FirebaseFirestore.DocumentReference, attempt: number, workerId: string, delivered: boolean, now: Date) {
  const db = await getFirebaseAdminFirestore();
  await db.runTransaction(async (transaction) => {
    const current = communityOutboxSchema.safeParse((await transaction.get(reference)).data());
    if (!current.success || current.data.state !== "leased" || current.data.leaseOwner !== workerId || current.data.attempt !== attempt) return;
    if (delivered) {
      transaction.delete(reference);
      return;
    }
    const retry = current.data.attempt < MAX_OUTBOX_ATTEMPTS;
    transaction.update(reference, {
      state: retry ? "pending" : "failed",
      leaseOwner: null,
      leaseExpiresAt: null,
      nextAttemptAt: retry ? new Date(now.getTime() + retryDelayMs(current.data.attempt)).toISOString() : current.data.nextAttemptAt,
      updatedAt: now.toISOString(),
    });
  });
}

export async function deleteCommunityDerivatives(
  postId: string,
  now: Date,
  { excludeOutboxId }: { excludeOutboxId?: string } = {},
) {
  const db = await getFirebaseAdminFirestore();
  const [projection, comments, interactions, postReports, notifications, shards, consents, postActions] = await Promise.all([
    db.collection(COMMUNITY_COLLECTIONS.projections).doc(postId).get(),
    db.collection(COMMUNITY_COLLECTIONS.comments).where("postId", "==", postId).get(),
    db.collection(COMMUNITY_COLLECTIONS.interactions).where("postId", "==", postId).get(),
    db.collection(COMMUNITY_COLLECTIONS.reports).where("targetType", "==", "post").where("targetId", "==", postId).get(),
    db.collection(COMMUNITY_COLLECTIONS.notifications).where("postId", "==", postId).get(),
    db.collection(COMMUNITY_COLLECTIONS.counterShards).where("postId", "==", postId).get(),
    db.collection(COMMUNITY_COLLECTIONS.consents).where("projectionId", "==", postId).get(),
    db.collection(COMMUNITY_COLLECTIONS.moderationActions).where("targetType", "==", "post").where("targetId", "==", postId).get(),
  ]);
  const commentIds = comments.docs.map((document) => document.id);
  const commentReports: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  const moderationActions = new Map(postActions.docs.map((document) => [document.id, document]));
  for (const commentId of commentIds) {
    const [reportSnapshot, actionSnapshot] = await Promise.all([
      db.collection(COMMUNITY_COLLECTIONS.reports).where("targetType", "==", "comment").where("targetId", "==", commentId).get(),
      db.collection(COMMUNITY_COLLECTIONS.moderationActions).where("targetType", "==", "comment").where("targetId", "==", commentId).get(),
    ]);
    commentReports.push(...reportSnapshot.docs);
    for (const action of actionSnapshot.docs) moderationActions.set(action.id, action);
  }
  const reportDocuments = [...postReports.docs, ...commentReports];
  const appealDocuments: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  const outboxDocuments: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const actionId of moderationActions.keys()) {
    const appeals = await db.collection(COMMUNITY_COLLECTIONS.appeals).where("actionId", "==", actionId).get();
    appealDocuments.push(...appeals.docs);
  }
  for (const targetId of [postId, ...commentIds, ...reportDocuments.map((document) => document.id)]) {
    const outbox = await db.collection(COMMUNITY_COLLECTIONS.outbox).where("targetId", "==", targetId).get();
    outboxDocuments.push(...outbox.docs.filter((document) => document.id !== excludeOutboxId));
  }
  const rawReferences = [
    ...comments.docs,
    ...interactions.docs,
    ...reportDocuments,
    ...notifications.docs,
    ...shards.docs,
    ...moderationActions.values(),
    ...appealDocuments,
    ...outboxDocuments,
  ].map((document) => document.ref);
  if (projection.exists) rawReferences.push(projection.ref);
  const references = [...new Map(rawReferences.map((reference, index) => [reference.path ?? reference.id ?? String(index), reference])).values()];
  for (let offset = 0; offset < references.length; offset += 400) {
    const batch = db.batch();
    for (const reference of references.slice(offset, offset + 400)) batch.delete(reference);
    await batch.commit();
  }
  for (let offset = 0; offset < consents.docs.length; offset += 400) {
    const batch = db.batch();
    for (const consent of consents.docs.slice(offset, offset + 400)) batch.update(consent.ref, { derivativeState: "deleted", updatedAt: now.toISOString() });
    await batch.commit();
  }
}

async function hideProjection(postId: string, now: Date) {
  const db = await getFirebaseAdminFirestore();
  const reference = db.collection(COMMUNITY_COLLECTIONS.projections).doc(postId);
  if ((await reference.get()).exists) await reference.update({ visibility: "hidden", updatedAt: now.toISOString() });
}

function retryDelayMs(attempt: number) {
  return Math.min(60 * 60_000, 1_000 * (2 ** Math.min(attempt, 10)));
}

function oldestAge(values: string[], now: Date) {
  return values.reduce((maximum, value) => Math.max(maximum, Math.max(0, now.getTime() - Date.parse(value))), 0);
}
