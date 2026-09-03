import "server-only";

import { timingSafeEqual } from "node:crypto";

type CommunitySafetyEnvironment = Readonly<Record<string, string | undefined>>;

export function getCommunitySafetyStatus(env: CommunitySafetyEnvironment = process.env) {
  const mode = env.IROGUIDE_COMMUNITY_SAFETY_MODE?.trim().toLowerCase() === "staff" ? "staff" : "closed";
  const auditKeyConfigured = (env.IROGUIDE_COMMUNITY_AUDIT_HMAC_KEY?.trim().length ?? 0) >= 32;
  const moderatorCount = csv(env.IROGUIDE_COMMUNITY_MODERATOR_UIDS).size;
  const seniorModeratorCount = csv(env.IROGUIDE_COMMUNITY_SENIOR_MODERATOR_UIDS).size;
  return {
    auditKeyConfigured,
    mode,
    moderatorCount,
    ready: mode === "closed" || (auditKeyConfigured && moderatorCount > 0 && seniorModeratorCount > 0),
    seniorModeratorCount,
  } as const;
}

export function isCommunityModerator(uid: string, env: CommunitySafetyEnvironment = process.env) {
  return hasConstantTimeValue(uid, csv(env.IROGUIDE_COMMUNITY_MODERATOR_UIDS))
    || hasConstantTimeValue(uid, csv(env.IROGUIDE_COMMUNITY_SENIOR_MODERATOR_UIDS));
}

export function isCommunitySeniorModerator(uid: string, env: CommunitySafetyEnvironment = process.env) {
  return hasConstantTimeValue(uid, csv(env.IROGUIDE_COMMUNITY_SENIOR_MODERATOR_UIDS));
}

function csv(value: string | undefined) {
  return new Set((value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean));
}

function hasConstantTimeValue(candidate: string, values: Set<string>) {
  const candidateBytes = Buffer.from(candidate);
  return [...values].some((value) => {
    const valueBytes = Buffer.from(value);
    return candidateBytes.length === valueBytes.length && timingSafeEqual(candidateBytes, valueBytes);
  });
}
