import "server-only";

import { timingSafeEqual } from "node:crypto";
import { getServerLaunchCapabilities } from "./launch-capabilities";

type ReviewPipelineEnvironment = Readonly<Record<string, string | undefined>>;

export function getReviewPipelineStatus(env: ReviewPipelineEnvironment = process.env) {
  const capabilities = getServerLaunchCapabilities(env);
  const mode = env.IROGUIDE_REVIEW_PIPELINE_MODE?.trim().toLowerCase() === "internal" ? "internal" : "disabled";
  const workerSecretConfigured = (env.IROGUIDE_INTERNAL_WORKER_KEY?.trim().length ?? 0) >= 32;
  return {
    adapter: mode === "internal" ? "internal-outbox" : "noop",
    enabled: mode === "internal" && capabilities.liveCritique && capabilities.reviewPipeline && workerSecretConfigured,
    mode,
    ready: mode === "disabled" || (capabilities.liveCritique && capabilities.reviewPipeline && workerSecretConfigured),
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
