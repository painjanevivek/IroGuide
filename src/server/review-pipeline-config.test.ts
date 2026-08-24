import { describe, expect, it } from "vitest";
import { getReviewPipelineStatus, isValidInternalWorkerRequest } from "./review-pipeline-config";

describe("review pipeline configuration", () => {
  it("is a ready no-op by default", () => {
    expect(getReviewPipelineStatus({ NODE_ENV: "production", IROGUIDE_LAUNCH_PROFILE: "free" })).toEqual({
      adapter: "noop",
      enabled: false,
      mode: "disabled",
      ready: true,
      workerSecretConfigured: false,
    });
  });

  it("requires the full profile and a sufficiently strong worker key", () => {
    const workerKey = "w".repeat(32);
    expect(getReviewPipelineStatus({
      NODE_ENV: "production",
      IROGUIDE_LAUNCH_PROFILE: "full",
      IROGUIDE_REVIEW_PIPELINE_MODE: "internal",
      IROGUIDE_INTERNAL_WORKER_KEY: workerKey,
    }).enabled).toBe(true);
    expect(getReviewPipelineStatus({
      NODE_ENV: "production",
      IROGUIDE_LAUNCH_PROFILE: "free",
      IROGUIDE_REVIEW_PIPELINE_MODE: "internal",
      IROGUIDE_INTERNAL_WORKER_KEY: workerKey,
    }).enabled).toBe(false);
  });

  it("compares the complete internal bearer secret", () => {
    const workerKey = "k".repeat(32);
    const request = new Request("https://example.test/internal", {
      headers: { authorization: `Bearer ${workerKey}` },
    });
    expect(isValidInternalWorkerRequest(request, { IROGUIDE_INTERNAL_WORKER_KEY: workerKey })).toBe(true);
    expect(isValidInternalWorkerRequest(request, { IROGUIDE_INTERNAL_WORKER_KEY: `${workerKey}x` })).toBe(false);
  });
});
