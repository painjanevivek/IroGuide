import "server-only";

import { createHmac, createHash, randomUUID } from "node:crypto";
import {
  communityAuditSchema,
  communityOutboxSchema,
  communityPublicProjectionSchema,
  type CommunityPublicProjection,
} from "@/domain/community-safety";

export const COMMUNITY_COLLECTIONS = {
  accountModeration: "communityAccountModeration",
  appeals: "communityAppeals",
  audit: "communityAudit",
  blocks: "communityBlocks",
  comments: "communityComments",
  consents: "communityConsents",
  counterShards: "communityCounterShards",
  interactions: "communityInteractions",
  moderationActions: "communityModerationActions",
  notifications: "communityNotifications",
  outbox: "communityOutbox",
  projections: "communityProjections",
  reports: "communityReports",
} as const;

export type CommunityActor = {
  uid: string;
  email?: unknown;
  name?: unknown;
  picture?: unknown;
};

export function communityDigest(...parts: string[]) {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex");
}

export function communityAuditDigest(value: string, env: Readonly<Record<string, string | undefined>> = process.env) {
  const key = env.IROGUIDE_COMMUNITY_AUDIT_HMAC_KEY?.trim();
  if (!key || key.length < 32) return null;
  return createHmac("sha256", key).update(value).digest("hex");
}

export function createCommunityAuditRecord({
  action,
  actorId,
  actorRole,
  now,
  reasonCode,
  targetId,
  targetType,
}: {
  action: string;
  actorId: string;
  actorRole: "user" | "moderator" | "system";
  now: Date;
  reasonCode: string;
  targetId: string;
  targetType: "post" | "comment" | "account" | "report" | "appeal";
}) {
  const actorHash = communityAuditDigest(actorId);
  const targetIdHash = communityAuditDigest(targetId);
  if (!actorHash || !targetIdHash) return null;
  return communityAuditSchema.parse({
    schemaVersion: 1,
    id: randomUUID(),
    action,
    actorRole,
    actorHash,
    targetType,
    targetIdHash,
    reasonCode,
    createdAt: now.toISOString(),
  });
}

export function createCommunityOutboxRecord(eventType: "hide-projection" | "delete-derivatives" | "repair-counters", targetId: string, now: Date) {
  const id = randomUUID();
  return communityOutboxSchema.parse({
    schemaVersion: 1,
    id,
    eventType,
    targetId,
    state: "pending",
    attempt: 0,
    nextAttemptAt: now.toISOString(),
    leaseOwner: null,
    leaseExpiresAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

export function toCommunityPublicProjection(value: unknown): CommunityPublicProjection {
  const record = value as Record<string, unknown>;
  return communityPublicProjectionSchema.parse({
    schemaVersion: record.schemaVersion,
    postId: record.postId,
    publicAuthor: record.publicAuthor,
    title: record.title,
    ...(record.note === undefined ? {} : { note: record.note }),
    category: record.category,
    critiqueExcerpt: record.critiqueExcerpt,
    stats: record.stats,
    publishedAt: record.publishedAt,
    consent: record.consent,
  });
}

export function getCommunityAuthor(actor: CommunityActor) {
  const name = typeof actor.name === "string" ? actor.name.trim().slice(0, 80) : "";
  const emailName = typeof actor.email === "string" ? actor.email.split("@")[0]?.trim().slice(0, 80) : "";
  const displayName = name || emailName || "IroGuide designer";
  const avatarUrl = getHttpsUrl(actor.picture);
  return { displayName, ...(avatarUrl ? { avatarUrl } : {}) };
}

function getHttpsUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2_000) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function getDefaultCommunityTitle(summary: string) {
  return summary.trim().slice(0, 120) || "A focused critique";
}
