import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { COMMUNITY_COLLECTIONS } from "./community-records";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const COUNTER_SHARD_COUNT = 16;
type CounterMetric = "comments" | "likes" | "saves";

export function getCommunityCounterShard(key: string) {
  return createHash("sha256").update(key).digest().readUInt32BE(0) % COUNTER_SHARD_COUNT;
}

export function incrementCommunityCounter({
  db,
  delta,
  metric,
  now,
  postId,
  shardKey,
  transaction,
}: {
  db: Firestore;
  delta: 1 | -1;
  metric: CounterMetric;
  now: Date;
  postId: string;
  shardKey: string;
  transaction: Transaction;
}) {
  const shard = getCommunityCounterShard(shardKey);
  const reference = db.collection(COMMUNITY_COLLECTIONS.counterShards).doc(`${postId}.${shard}`);
  transaction.set(reference, {
    schemaVersion: 1,
    postId,
    shard,
    comments: FieldValue.increment(metric === "comments" ? delta : 0),
    likes: FieldValue.increment(metric === "likes" ? delta : 0),
    saves: FieldValue.increment(metric === "saves" ? delta : 0),
    updatedAt: now.toISOString(),
  }, { merge: true });
}

export async function reconcileCommunityCounters({ postId, now = new Date() }: { postId?: string; now?: Date } = {}) {
  const db = await getFirebaseAdminFirestore();
  const projectionQuery = postId
    ? db.collection(COMMUNITY_COLLECTIONS.projections).where("postId", "==", postId).limit(1)
    : db.collection(COMMUNITY_COLLECTIONS.projections).limit(100);
  const projections = await projectionQuery.get();
  let repaired = 0;
  let maximumDrift = 0;

  for (const projectionDocument of projections.docs) {
    const current = projectionDocument.data();
    const currentPostId = String(current.postId ?? projectionDocument.id);
    const [comments, interactions, shards] = await Promise.all([
      db.collection(COMMUNITY_COLLECTIONS.comments).where("postId", "==", currentPostId).get(),
      db.collection(COMMUNITY_COLLECTIONS.interactions).where("postId", "==", currentPostId).get(),
      db.collection(COMMUNITY_COLLECTIONS.counterShards).where("postId", "==", currentPostId).get(),
    ]);
    const exact = {
      comments: comments.docs.filter((item) => item.data().status === "visible").length,
      likes: interactions.docs.filter((item) => item.data().type === "liked" && item.data().active === true).length,
      saves: interactions.docs.filter((item) => item.data().type === "saved" && item.data().active === true).length,
    };
    const exactShards = Array.from({ length: COUNTER_SHARD_COUNT }, (_, shard) => ({ shard, comments: 0, likes: 0, saves: 0 }));
    for (const item of comments.docs) {
      if (item.data().status === "visible") exactShards[getCommunityCounterShard(item.id)]!.comments += 1;
    }
    for (const item of interactions.docs) {
      const data = item.data();
      if (data.active !== true) continue;
      const shard = exactShards[getCommunityCounterShard(item.id)]!;
      if (data.type === "liked") shard.likes += 1;
      if (data.type === "saved") shard.saves += 1;
    }
    const stored = normalizeStats(current.stats);
    const projectionDrift = Math.abs(exact.comments - stored.comments)
      + Math.abs(exact.likes - stored.likes)
      + Math.abs(exact.saves - stored.saves);
    const storedShards = new Map(shards.docs.map((document) => [document.id, normalizeStats(document.data())]));
    const shardDrift = exactShards.reduce((total, shard) => {
      const value = storedShards.get(`${currentPostId}.${shard.shard}`) ?? { comments: 0, likes: 0, saves: 0 };
      return total + Math.abs(shard.comments - value.comments) + Math.abs(shard.likes - value.likes) + Math.abs(shard.saves - value.saves);
    }, 0);
    const drift = projectionDrift + shardDrift;
    maximumDrift = Math.max(maximumDrift, drift);
    if (drift === 0 && shards.size === COUNTER_SHARD_COUNT) continue;

    const batch = db.batch();
    batch.update(projectionDocument.ref, { stats: exact, updatedAt: now.toISOString() });
    for (const shard of shards.docs) batch.delete(shard.ref);
    for (const shard of exactShards) {
      batch.set(db.collection(COMMUNITY_COLLECTIONS.counterShards).doc(`${currentPostId}.${shard.shard}`), {
        schemaVersion: 1,
        postId: currentPostId,
        ...shard,
        updatedAt: now.toISOString(),
      });
    }
    await batch.commit();
    repaired += 1;
  }

  return { maximumDrift, repaired, sampled: projections.size === 100 };
}

export async function getCommunityCounterDiagnostics() {
  const db = await getFirebaseAdminFirestore();
  const [projections, shards] = await Promise.all([
    db.collection(COMMUNITY_COLLECTIONS.projections).limit(100).get(),
    db.collection(COMMUNITY_COLLECTIONS.counterShards).limit(1_600).get(),
  ]);
  const totals = new Map<string, { comments: number; likes: number; saves: number }>();
  for (const shard of shards.docs) {
    const data = shard.data();
    const postId = typeof data.postId === "string" ? data.postId : "";
    if (!postId) continue;
    const current = totals.get(postId) ?? { comments: 0, likes: 0, saves: 0 };
    const next = normalizeStats(data);
    totals.set(postId, {
      comments: current.comments + next.comments,
      likes: current.likes + next.likes,
      saves: current.saves + next.saves,
    });
  }
  const drifts = projections.docs.map((projection) => {
    const data = projection.data();
    const postId = typeof data.postId === "string" ? data.postId : projection.id;
    const expected = totals.get(postId) ?? { comments: 0, likes: 0, saves: 0 };
    const stored = normalizeStats(data.stats);
    return Math.abs(expected.comments - stored.comments)
      + Math.abs(expected.likes - stored.likes)
      + Math.abs(expected.saves - stored.saves);
  });
  return {
    driftingProjectionCount: drifts.filter((drift) => drift > 0).length,
    maximumDrift: drifts.reduce((maximum, drift) => Math.max(maximum, drift), 0),
    projectionCount: projections.size,
    sampled: projections.size === 100 || shards.size === 1_600,
    shardCount: shards.size,
  };
}

function normalizeStats(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    comments: asCounter(record.comments),
    likes: asCounter(record.likes),
    saves: asCounter(record.saves),
  };
}

function asCounter(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
