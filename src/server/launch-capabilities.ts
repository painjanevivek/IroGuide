import "server-only";
import { resolveLaunchCapabilities, type ProductCapability } from "@/domain/launch-capabilities";

const capabilityEnvironment: Record<ProductCapability, string> = {
  guidedLearning: "IROGUIDE_CAPABILITY_GUIDED_LEARNING",
  liveCritique: "IROGUIDE_CAPABILITY_LIVE_CRITIQUE",
  improvementTracking: "IROGUIDE_CAPABILITY_IMPROVEMENT_TRACKING",
  revisionComparison: "IROGUIDE_CAPABILITY_REVISION_COMPARISON",
  followUpConversation: "IROGUIDE_CAPABILITY_FOLLOW_UP_CONVERSATION",
  privatePortfolio: "IROGUIDE_CAPABILITY_PRIVATE_PORTFOLIO",
  publicPortfolio: "IROGUIDE_CAPABILITY_PUBLIC_PORTFOLIO",
  community: "IROGUIDE_CAPABILITY_COMMUNITY",
  billing: "IROGUIDE_CAPABILITY_BILLING",
  productEvidence: "IROGUIDE_CAPABILITY_PRODUCT_EVIDENCE",
  bugReportEmail: "IROGUIDE_CAPABILITY_BUG_REPORT_EMAIL",
  reviewPipeline: "IROGUIDE_CAPABILITY_REVIEW_PIPELINE",
  sourceImageStorage: "IROGUIDE_CAPABILITY_SOURCE_IMAGE_STORAGE",
};

export function getServerLaunchCapabilities(env: Readonly<Record<string, string | undefined>> = process.env) {
  return resolveLaunchCapabilities({
    nodeEnv: env.NODE_ENV,
    launchProfile: env.IROGUIDE_LAUNCH_PROFILE,
    capabilities: Object.fromEntries(Object.entries(capabilityEnvironment).map(([capability, environment]) => [
      capability,
      env[environment],
    ])),
  });
}

export function getCapabilityEnvironmentName(capability: ProductCapability) {
  return capabilityEnvironment[capability];
}
