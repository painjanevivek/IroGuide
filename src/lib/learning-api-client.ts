"use client";

import type { User } from "firebase/auth";
import {
  designBriefDraftSchema,
  reviewAccessInterestSchema,
  selfReviewSessionSchema,
  type AccessInterestCreate,
  type AccessInterestRevoke,
  type DesignBriefDraft,
  type DesignBriefPut,
  type ReviewAccessInterest,
  type SelfReviewCreate,
  type SelfReviewPatch,
  type SelfReviewSession,
} from "@/domain/product-activation";

export type PublicSelfReview = Omit<SelfReviewSession, "userId" | "recentMutationIds">;
export type PublicDesignBrief = Omit<DesignBriefDraft, "userId" | "recentMutationIds">;
export type PublicAccessInterest = Omit<ReviewAccessInterest, "userId" | "recentMutationIds">;

export class LearningRequestError extends Error {
  constructor(message: string, readonly status: number, readonly currentRevision?: number) {
    super(message);
    this.name = "LearningRequestError";
  }
}

export async function listSelfReviews(user: User) {
  const payload = await requestJson(user, "/api/self-reviews", { method: "GET" });
  return arrayField(payload, "records").map(parsePublicSelfReview);
}

export async function createSelfReview(user: User, input: SelfReviewCreate) {
  return parsePublicSelfReview(recordField(await requestJson(user, "/api/self-reviews", jsonInit("POST", input)), "record"));
}

export async function updateSelfReview(user: User, input: SelfReviewPatch) {
  return parsePublicSelfReview(recordField(await requestJson(user, "/api/self-reviews", jsonInit("PATCH", input)), "record"));
}

export async function clearSelfReviews(user: User) {
  return requestJson(user, "/api/self-reviews", jsonInit("DELETE", { schemaVersion: 1, mutationId: crypto.randomUUID(), scope: "all" }));
}

export async function listDesignBriefs(user: User) {
  const payload = await requestJson(user, "/api/design-briefs", { method: "GET" });
  return arrayField(payload, "records").map((record) => designBriefDraftSchema.omit({ userId: true, recentMutationIds: true }).parse(record));
}

export async function saveDesignBrief(user: User, input: DesignBriefPut) {
  return designBriefDraftSchema.omit({ userId: true, recentMutationIds: true }).parse(
    recordField(await requestJson(user, "/api/design-briefs", jsonInit("PUT", input)), "record"),
  );
}

export async function deleteDesignBrief(user: User, id: string) {
  return requestJson(user, "/api/design-briefs", jsonInit("DELETE", { schemaVersion: 1, mutationId: crypto.randomUUID(), id }));
}

export async function recordAccessInterest(user: User, input: AccessInterestCreate) {
  return reviewAccessInterestSchema.omit({ userId: true, recentMutationIds: true }).parse(
    recordField(await requestJson(user, "/api/access-interest", jsonInit("POST", input)), "record"),
  );
}

export async function revokeAccessInterest(user: User, input: AccessInterestRevoke) {
  const record = recordField(await requestJson(user, "/api/access-interest", jsonInit("DELETE", input)), "record", true);
  return record === null ? null : reviewAccessInterestSchema.omit({ userId: true, recentMutationIds: true }).parse(record);
}

export async function clearLearningHistory(user: User) {
  return requestJson(user, "/api/account/experience", jsonInit("DELETE", { schemaVersion: 1, scope: "learning-history" }));
}

async function requestJson(user: User, url: string, init: RequestInit) {
  let token: string;
  try {
    token = await user.getIdToken();
  } catch {
    throw new LearningRequestError("Your session expired. Sign in again to continue.", 401);
  }
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new LearningRequestError("The learning workspace could not reach the server. Your current answers remain on this screen.", 503);
  }
  const payload = await readPayload(response);
  if (!response.ok) {
    throw new LearningRequestError(
      stringField(payload, "error") || "The learning workspace is temporarily unavailable.",
      response.status,
      numberField(payload, "currentRevision"),
    );
  }
  return payload;
}

function parsePublicSelfReview(record: unknown): PublicSelfReview {
  if (!isRecord(record) || "userId" in record || "recentMutationIds" in record) throw invalidResponse();
  try {
    const parsed = selfReviewSessionSchema.parse({ ...record, userId: "client-redacted", recentMutationIds: [] });
    const { userId: _userId, recentMutationIds: _recentMutationIds, ...publicRecord } = parsed;
    void _userId;
    void _recentMutationIds;
    return publicRecord;
  } catch {
    throw invalidResponse();
  }
}

function jsonInit(method: "POST" | "PUT" | "PATCH" | "DELETE", body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function readPayload(response: Response) {
  try { return await response.json() as unknown; } catch { return null; }
}

function arrayField(value: unknown, key: string) {
  if (!isRecord(value) || !Array.isArray(value[key])) throw invalidResponse();
  return value[key];
}

function recordField(value: unknown, key: string, nullable = false) {
  if (!isRecord(value)) throw invalidResponse();
  const record = value[key];
  if (nullable && record === null) return null;
  if (!isRecord(record)) throw invalidResponse();
  return record;
}

function invalidResponse() {
  return new LearningRequestError("The learning workspace returned an invalid response.", 503);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown, key: string) {
  return isRecord(value) && typeof value[key] === "string" ? value[key] : "";
}

function numberField(value: unknown, key: string) {
  return isRecord(value) && typeof value[key] === "number" ? value[key] : undefined;
}
