import { NextResponse } from "next/server";
import type { LaunchCapabilities } from "@/domain/launch-capabilities";
import { getServerLaunchCapabilities } from "./launch-capabilities";
import { jsonHeaders, logRequestEvent, toLogSafeUserId, type RequestContext } from "./observability";
import { hasReviewGenerationAccess, type ReviewAccessCandidate } from "./review-access";

export const FREE_LAUNCH_REVIEW_MESSAGE = "Live critique is unavailable. Continue with the free guided practice instead.";
export const REVIEW_ACCESS_MESSAGE = "Verify your email and request beta review access before starting a critique.";

type ReviewGenerationPolicyInput = {
  capabilities?: LaunchCapabilities;
  context: RequestContext;
  eventPrefix: string;
  user: ReviewAccessCandidate;
};

type ReviewGenerationPolicyResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse };

export function enforceReviewGenerationPolicy({
  capabilities = getServerLaunchCapabilities(),
  context,
  eventPrefix,
  user,
}: ReviewGenerationPolicyInput): ReviewGenerationPolicyResult {
  if (!capabilities.liveCritique) {
    logRequestEvent("info", `${eventPrefix}.capability_disabled`, context, {
      profile: capabilities.profile,
      user: toLogSafeUserId(user.uid),
    });
    return {
      allowed: false,
      response: NextResponse.json(
        { error: FREE_LAUNCH_REVIEW_MESSAGE },
        { status: 403, headers: jsonHeaders(context) },
      ),
    };
  }

  if (!hasReviewGenerationAccess(user)) {
    logRequestEvent("warn", `${eventPrefix}.access_denied`, context, {
      user: toLogSafeUserId(user.uid),
    });
    return {
      allowed: false,
      response: NextResponse.json(
        { error: REVIEW_ACCESS_MESSAGE },
        { status: 403, headers: jsonHeaders(context) },
      ),
    };
  }

  return { allowed: true };
}
