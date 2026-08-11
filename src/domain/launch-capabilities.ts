export type LaunchProfile = "free" | "full" | "development";

export type LaunchCapabilities = Readonly<{
  profile: LaunchProfile;
  aiCritique: boolean;
  bugReportEmail: boolean;
  sourceImageStorage: boolean;
}>;

type LaunchCapabilityInput = {
  nodeEnv?: string;
  launchProfile?: string;
};

const CAPABILITIES: Readonly<Record<LaunchProfile, LaunchCapabilities>> = Object.freeze({
  free: Object.freeze({
    profile: "free",
    aiCritique: false,
    bugReportEmail: false,
    sourceImageStorage: false,
  }),
  full: Object.freeze({
    profile: "full",
    aiCritique: true,
    bugReportEmail: true,
    sourceImageStorage: true,
  }),
  development: Object.freeze({
    profile: "development",
    aiCritique: true,
    bugReportEmail: false,
    sourceImageStorage: false,
  }),
});

export function resolveLaunchCapabilities({ nodeEnv, launchProfile }: LaunchCapabilityInput): LaunchCapabilities {
  if (launchProfile === "free" || launchProfile === "full") {
    return CAPABILITIES[launchProfile];
  }

  return nodeEnv === "production" ? CAPABILITIES.free : CAPABILITIES.development;
}
