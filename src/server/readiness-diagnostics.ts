import { isBugReportEmailConfigured } from "@/server/bug-report-email";
import { getFirebaseAdminProjectId, isFirebaseAdminConfigured, isFirebaseAdminStorageConfigured } from "@/server/firebase-admin";
import { getServerLaunchCapabilities } from "@/server/launch-capabilities";
import { buildReadiness } from "@/server/readiness";
import { getReviewProviderStatus } from "@/server/review-provider";
import { isClientIdentityConfigured } from "@/server/observability";
import { getRateLimitStatus } from "@/server/rate-limit";
import { getRequestBodyBudgetStatus } from "@/server/request-body";
import { getProductEvidenceStatus } from "@/server/product-evidence";
import { getReviewPipelineStatus } from "@/server/review-pipeline-config";

/**
 * Detailed configuration diagnostics are privileged operational information.
 * Callers must authorize before returning this object over HTTP.
 */
export function getReadinessDiagnostics() {
  const reviewProvider = getReviewProviderStatus();
  const capabilities = getServerLaunchCapabilities();
  const accountStorageProjectId = getFirebaseAdminProjectId();
  const publicFirebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || null;
  const rateLimit = getRateLimitStatus();
  const requestBudgets = getRequestBodyBudgetStatus();
  const productEvidence = getProductEvidenceStatus();
  const reviewPipeline = getReviewPipelineStatus();
  const checks = {
    accountStorage: isFirebaseAdminConfigured(),
    bugReportEmail: isBugReportEmailConfigured(),
    clientIdentity: isClientIdentityConfigured(),
    firebaseProjectMatch: Boolean(accountStorageProjectId && publicFirebaseProjectId && accountStorageProjectId === publicFirebaseProjectId),
    liveVision: reviewProvider.liveReady,
    productEvidence: productEvidence.ready,
    reviewPipeline: reviewPipeline.ready,
    rateLimitAdapter: rateLimit.ready,
    requestBudgets: requestBudgets.ready,
    sourceImageStorage: isFirebaseAdminStorageConfigured(),
  };

  return {
    ...buildReadiness({ capabilities, checks }),
    operations: {
      communityGate: capabilities.community ? "open" : "closed",
      deletionFailureMode: "retry-required",
      distributedRateLimitConfigured: rateLimit.distributedConfigured,
      rateLimitMode: rateLimit.mode,
      productEvidenceMode: productEvidence.mode,
      reviewPipelineMode: reviewPipeline.mode,
      requestBodyRoutes: requestBudgets.configuredRoutes,
    },
    reviewProvider,
  };
}

export function toPublicReadiness(diagnostics: ReturnType<typeof getReadinessDiagnostics>) {
  return { ok: diagnostics.ok };
}
