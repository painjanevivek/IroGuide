import type { LaunchCapabilities } from "@/domain/launch-capabilities";

export type ReadinessChecks = Readonly<{
  accountStorage: boolean;
  bugReportEmail: boolean;
  clientIdentity: boolean;
  firebaseProjectMatch: boolean;
  liveVision: boolean;
  productEvidence: boolean;
  providerControls: boolean;
  reviewPipeline: boolean;
  rateLimitAdapter: boolean;
  requestBudgets: boolean;
  sourceImageStorage: boolean;
}>;

export function buildReadiness({
  capabilities,
  checks,
}: {
  capabilities: LaunchCapabilities;
  checks: ReadinessChecks;
}) {
  const coreReady = checks.accountStorage
    && checks.clientIdentity
    && checks.firebaseProjectMatch
    && checks.productEvidence
    && checks.providerControls
    && checks.reviewPipeline
    && checks.rateLimitAdapter
    && checks.requestBudgets;
  const optionalReady = (!capabilities.aiCritique || checks.liveVision)
    && (!capabilities.bugReportEmail || checks.bugReportEmail)
    && (!capabilities.sourceImageStorage || checks.sourceImageStorage);

  return {
    ok: coreReady && optionalReady,
    capabilities,
    checks,
  } as const;
}
