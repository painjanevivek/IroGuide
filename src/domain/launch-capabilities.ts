export type LaunchProfile = "free" | "full" | "development";

export const productCapabilityNames = [
  "guidedLearning",
  "liveCritique",
  "improvementTracking",
  "revisionComparison",
  "followUpConversation",
  "privatePortfolio",
  "publicPortfolio",
  "community",
  "billing",
  "productEvidence",
  "bugReportEmail",
  "reviewPipeline",
  "sourceImageStorage",
] as const;

export type ProductCapability = (typeof productCapabilityNames)[number];

export type LaunchCapabilities = Readonly<{
  profile: LaunchProfile;
} & Record<ProductCapability, boolean>>;

export type LaunchCapabilityInput = {
  nodeEnv?: string;
  launchProfile?: string;
  capabilities?: Partial<Record<ProductCapability, string | undefined>>;
};

const CLOSED_CAPABILITIES = Object.freeze(Object.fromEntries(
  productCapabilityNames.map((capability) => [capability, false]),
) as Record<ProductCapability, boolean>);

export function resolveLaunchCapabilities({
  nodeEnv,
  launchProfile,
  capabilities = {},
}: LaunchCapabilityInput): LaunchCapabilities {
  const profile = resolveProfile(nodeEnv, launchProfile);
  const resolved = Object.fromEntries(productCapabilityNames.map((capability) => [
    capability,
    capabilities[capability] === "true",
  ])) as Record<ProductCapability, boolean>;

  return Object.freeze({ profile, ...CLOSED_CAPABILITIES, ...resolved });
}

export function isProductCapability(value: string): value is ProductCapability {
  return productCapabilityNames.includes(value as ProductCapability);
}

function resolveProfile(nodeEnv: string | undefined, launchProfile: string | undefined): LaunchProfile {
  if (launchProfile === "free" || launchProfile === "full" || launchProfile === "development") {
    return launchProfile;
  }
  return nodeEnv === "production" ? "free" : "development";
}
