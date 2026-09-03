"use client";

import type { User } from "firebase/auth";
import {
  accountExperienceSchema,
  reviewAccessInterestSchema,
  sampleCritiqueProgressSchema,
  type AccountExperience,
  type AccountExperiencePatch,
  type ReviewAccessInterest,
  type SampleCritiqueProgress,
} from "@/domain/product-activation";

export type PublicAccountExperience = Omit<AccountExperience, "userId" | "recentMutationIds">;
export type PublicSampleProgress = Omit<SampleCritiqueProgress, "userId" | "recentMutationIds">;
export type PublicAccessInterest = Omit<ReviewAccessInterest, "userId" | "recentMutationIds">;
export type AccountExperienceBundle = {
  experience: PublicAccountExperience;
  sampleProgress: PublicSampleProgress[];
  accessInterest: PublicAccessInterest | null;
};

export class AccountExperienceRequestError extends Error {
  constructor(message: string, readonly status: number, readonly currentRevision?: number) {
    super(message);
    this.name = "AccountExperienceRequestError";
  }
}

export async function loadAccountExperience(user: User, signal?: AbortSignal) {
  return requestAccountExperience(user, { method: "GET", signal });
}

export async function saveAccountExperience(user: User, input: AccountExperiencePatch) {
  return requestAccountExperience(user, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

async function requestAccountExperience(user: User, init: RequestInit) {
  let token: string;
  try {
    token = await user.getIdToken();
  } catch {
    throw new AccountExperienceRequestError("Your session expired. Sign in again to continue.", 401);
  }
  let response: Response;
  try {
    response = await fetch("/api/account/experience", {
      ...init,
      cache: "no-store",
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new AccountExperienceRequestError("Learning progress could not reach the server. Your answers remain on this screen.", 503);
  }
  const payload = await readPayload(response);
  if (!response.ok) {
    throw new AccountExperienceRequestError(
      stringField(payload, "error") || "Learning progress is unavailable.",
      response.status,
      numberField(payload, "currentRevision"),
    );
  }
  return parseBundle(payload);
}

function parseBundle(payload: unknown): AccountExperienceBundle {
  if (!isRecord(payload) || !isRecord(payload.experience) || !Array.isArray(payload.sampleProgress)) {
    throw new AccountExperienceRequestError("Learning progress returned an invalid response.", 503);
  }
  try {
    const experience = accountExperienceSchema.omit({ userId: true, recentMutationIds: true }).parse(payload.experience);
    const sampleProgress = payload.sampleProgress.map(parsePublicSampleProgress);
    const accessInterest = payload.accessInterest === null
      ? null
      : reviewAccessInterestSchema.omit({ userId: true, recentMutationIds: true }).parse(payload.accessInterest);
    return { experience, sampleProgress, accessInterest };
  } catch (error) {
    if (error instanceof AccountExperienceRequestError) throw error;
    throw new AccountExperienceRequestError("Learning progress returned an invalid response.", 503);
  }
}

function parsePublicSampleProgress(record: unknown): PublicSampleProgress {
  if (!isRecord(record) || "userId" in record || "recentMutationIds" in record) {
    throw new AccountExperienceRequestError("Learning progress returned an invalid response.", 503);
  }
  const parsed = sampleCritiqueProgressSchema.parse({
    ...record,
    userId: "client-redacted",
    recentMutationIds: [],
  });
  const { userId: _userId, recentMutationIds: _recentMutationIds, ...publicRecord } = parsed;
  void _userId;
  void _recentMutationIds;
  return publicRecord;
}

async function readPayload(response: Response) {
  try {
    return await response.json() as unknown;
  } catch {
    return null;
  }
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
