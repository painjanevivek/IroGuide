import "server-only";

import { timingSafeEqual } from "node:crypto";
import { resolveLaunchCapabilities } from "@/domain/launch-capabilities";

type ReviewPipelineEnvironment = Readonly<Record<string, string | undefined>>;

export function getReviewPipelineStatus(env: ReviewPipelineEnvironment = process.env) {
  const capabilities = resolveLaunchCapabilities({
    nodeEnv: env.NODE_ENV,
    launchProfile: env.IROGUIDE_LAUNCH_PROFILE,
  });
  const mode = env.IROGUIDE_REVIEW_PIPELINE_MODE?.trim().toLowerCase() === "internal" ? "internal" : "disabled";
  const workerSecretConfigured = (env.IROGUIDE_INTERNAL_WORKER_KEY?.trim().length ?? 0) >= 32;
  return {
    adapter: mode === "internal" ? "internal-outbox" : "noop",
    enabled: mode === "internal" && capabilities.aiCritique && workerSecretConfigured,
    mode,
    ready: mode === "disabled" || (capabilities.aiCritique && workerSecretConfigured),
    workerSecretConfigured,
  } as const;
}

export function isValidInternalWorkerRequest(request: Request, env: ReviewPipelineEnvironment = process.env) {
  const expected = env.IROGUIDE_INTERNAL_WORKER_KEY?.trim() ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
