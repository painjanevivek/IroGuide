"use client";

import type { User } from "firebase/auth";
import { dashboardGuideSchema } from "@/domain/dashboard-guide";
import { LearningRequestError } from "./learning-api-client";

export async function loadDashboardGuide(user: User, signal?: AbortSignal) {
  let token: string;
  try { token = await user.getIdToken(); } catch { throw new LearningRequestError("Your session expired. Sign in again to continue.", 401); }
  let response: Response;
  try {
    response = await fetch("/api/dashboard/guide", { method: "GET", cache: "no-store", headers: { Authorization: `Bearer ${token}` }, signal });
  } catch {
    throw new LearningRequestError("Your guide could not reach the server. Readable review history remains available on this device.", 503);
  }
  let payload: unknown;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "Your guide is temporarily unavailable.";
    throw new LearningRequestError(message, response.status);
  }
  try { return dashboardGuideSchema.parse(payload); } catch { throw new LearningRequestError("Your guide returned an invalid response.", 503); }
}
