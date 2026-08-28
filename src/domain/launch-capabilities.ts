export type LaunchProfile = "free" | "full" | "development";

export type LaunchCapabilities = Readonly<{
  profile: LaunchProfile;
  aiCritique: boolean;
  bugReportEmail: boolean;
  community: boolean;
  guidedLearning: boolean;
  sourceImageStorage: boolean;
}>;

type LaunchCapabilityInput = {
  nodeEnv?: string;
  launchProfile?: string;
  guidedLearning?: string;
};

const CAPABILITIES: Readonly<Record<LaunchProfile, LaunchCapabilities>> = Object.freeze({
  free: Object.freeze({
    profile: "free",
    aiCritique: false,
    bugReportEmail: false,
    community: false,
    guidedLearning: false,
    sourceImageStorage: false,
  }),
  full: Object.freeze({
    profile: "full",
    aiCritique: true,
    bugReportEmail: true,
    community: false,
    guidedLearning: false,
    sourceImageStorage: true,
  }),
  development: Object.freeze({
    profile: "development",
    aiCritique: true,
    bugReportEmail: false,
    community: false,
    guidedLearning: false,
    sourceImageStorage: false,
  }),
});

export function resolveLaunchCapabilities({ nodeEnv, launchProfile, guidedLearning }: LaunchCapabilityInput): LaunchCapabilities {
  const guidedLearningEnabled = guidedLearning === "true";
  if (launchProfile === "free" || launchProfile === "full") {
    return Object.freeze({ ...CAPABILITIES[launchProfile], guidedLearning: guidedLearningEnabled });
  }

  const profile = nodeEnv === "production" ? CAPABILITIES.free : CAPABILITIES.development;
  return Object.freeze({ ...profile, guidedLearning: guidedLearningEnabled });
}
