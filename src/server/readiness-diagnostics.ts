import { isBugReportEmailConfigured } from "@/server/bug-report-email";
import { getFirebaseAdminProjectId, isFirebaseAdminConfigured, isFirebaseAdminStorageConfigured } from "@/server/firebase-admin";
import { getServerLaunchCapabilities } from "@/server/launch-capabilities";
import { buildReadiness } from "@/server/readiness";
import { getReviewProviderStatus } from "@/server/review-provider";
import { isClientIdentityConfigured } from "@/server/observability";

/**
 * Detailed configuration diagnostics are privileged operational information.
 * Callers must authorize before returning this object over HTTP.
 */
export function getReadinessDiagnostics() {
  const reviewProvider = getReviewProviderStatus();
  const capabilities = getServerLaunchCapabilities();
  const accountStorageProjectId = getFirebaseAdminProjectId();
  const publicFirebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || null;
  const checks = {
    accountStorage: isFirebaseAdminConfigured(),
    bugReportEmail: isBugReportEmailConfigured(),
    clientIdentity: isClientIdentityConfigured(),
    firebaseProjectMatch: Boolean(accountStorageProjectId && publicFirebaseProjectId && accountStorageProjectId === publicFirebaseProjectId),
    liveVision: reviewProvider.liveReady,
    sourceImageStorage: isFirebaseAdminStorageConfigured(),
  };

  return {
    ...buildReadiness({ capabilities, checks }),
    reviewProvider,
  };
}

export function toPublicReadiness(diagnostics: ReturnType<typeof getReadinessDiagnostics>) {
  return { ok: diagnostics.ok };
}
