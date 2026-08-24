import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pipeline = vi.hoisted(() => ({
  cancelOwnedReviewJob: vi.fn(),
  createReviewJob: vi.fn(),
  createReviewUploadSession: vi.fn(),
  dispatchNextReviewPipelineEvent: vi.fn(),
  finalizeReviewUpload: vi.fn(),
  getOwnedReviewJob: vi.fn(),
  getOwnedReviewUpload: vi.fn(),
  getReviewPipelineDiagnostics: vi.fn(),
  reconcileReviewPipeline: vi.fn(),
  revokeReviewUpload: vi.fn(),
  runReviewJob: vi.fn(),
  validateStoredReviewUpload: vi.fn(),
}));

vi.mock("@/server/review-pipeline-storage", () => ({
  ...pipeline,
  ReviewPipelineError: class ReviewPipelineError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
}));

import { POST as dispatch } from "./internal/review-pipeline/dispatch/route";
import { POST as reconcile } from "./internal/review-pipeline/reconcile/route";
import { POST as runJob } from "./internal/review-jobs/[id]/run/route";
import { POST as validateUpload } from "./internal/review-uploads/[id]/validate/route";
import { POST as createJob } from "./review-jobs/route";
import { DELETE as cancelJob, GET as getJob } from "./review-jobs/[id]/route";
import { POST as createUpload } from "./review-uploads/route";
import { DELETE as revokeUpload, GET as getUpload } from "./review-uploads/[id]/route";
import { POST as finalizeUpload } from "./review-uploads/[id]/finalize/route";

const params = { params: Promise.resolve({ id: "018f1a80-7b5a-7c61-a9be-2f38de60ec98" }) };

describe("inactive review pipeline routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("IROGUIDE_LAUNCH_PROFILE", "free");
    vi.stubEnv("IROGUIDE_REVIEW_PIPELINE_MODE", "disabled");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["create upload", createUpload, "POST", undefined],
    ["finalize upload", finalizeUpload, "POST", params],
    ["revoke upload", revokeUpload, "DELETE", params],
    ["read upload", getUpload, "GET", params],
    ["create job", createJob, "POST", undefined],
    ["read job", getJob, "GET", params],
    ["cancel job", cancelJob, "DELETE", params],
    ["validate upload worker", validateUpload, "POST", params],
    ["run job worker", runJob, "POST", params],
    ["dispatch worker", dispatch, "POST", undefined],
    ["reconcile worker", reconcile, "POST", undefined],
  ] as const)("returns 404 before any %s work", async (_name, handler, method, routeContext) => {
    const request = new Request("https://iroguide.com/api/review-pipeline-test", {
      method,
      headers: { Authorization: "Bearer should-not-be-used", Origin: "https://iroguide.com" },
    });
    const response = routeContext
      ? await (handler as (request: Request, context: typeof params) => Promise<Response>)(request, routeContext)
      : await (handler as (request: Request) => Promise<Response>)(request);
    expect(response.status).toBe(404);
    for (const operation of Object.values(pipeline)) expect(operation).not.toHaveBeenCalled();
  });
});
