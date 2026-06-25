import { ProgressFlow } from "@/components/progress-flow";

const ANALYSIS_STAGES = [
  { title: "Securing upload", detail: "Checking your signed-in session and preparing the private request." },
  { title: "Reading composition", detail: "Analyzing the uploaded image pixels, layout, hierarchy, and visual detail." },
  { title: "Comparing brief and audience", detail: "Matching the critique tone to your category, goal, and audience." },
  { title: "Building recommendations", detail: "Ordering observations into practical next steps." },
  { title: "Checking review consistency", detail: "Validating the structured critique before it appears." },
] as const;

const STAGE_INTERVAL_MS = 2200;
const LONG_RUNNING_MS = 25000;

export function AnalysisStageDisplay() {
  return (
    <ProgressFlow
      backgroundNote="Still working. Your upload, brief, and form entries are kept in place if the request needs a retry."
      longRunningMs={LONG_RUNNING_MS}
      stageIntervalMs={STAGE_INTERVAL_MS}
      steps={ANALYSIS_STAGES}
      title="Vision critique in progress"
    />
  );
}
