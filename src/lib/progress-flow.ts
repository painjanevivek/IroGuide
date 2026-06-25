export type ProgressFlowStatus = "running" | "success" | "error";

export type ProgressFlowSnapshot = {
  activeStepIndex: number;
  isLongRunning: boolean;
  progressRatio: number;
};

const DEFAULT_STAGE_INTERVAL_MS = 2200;
const DEFAULT_LONG_RUNNING_MS = 25_000;
const MAX_UNCONFIRMED_PROGRESS = 0.88;

export function getProgressFlowSnapshot({
  elapsedMs,
  stageIntervalMs = DEFAULT_STAGE_INTERVAL_MS,
  longRunningMs = DEFAULT_LONG_RUNNING_MS,
  status,
  stepCount,
}: {
  elapsedMs: number;
  stageIntervalMs?: number;
  longRunningMs?: number;
  status: ProgressFlowStatus;
  stepCount: number;
}): ProgressFlowSnapshot {
  const safeStepCount = Math.max(1, stepCount);
  const safeElapsedMs = Math.max(0, elapsedMs);
  const safeStageIntervalMs = Math.max(1, stageIntervalMs);

  if (status === "success") {
    return {
      activeStepIndex: safeStepCount - 1,
      isLongRunning: safeElapsedMs >= longRunningMs,
      progressRatio: 1,
    };
  }

  if (status === "error") {
    return {
      activeStepIndex: Math.min(Math.floor(safeElapsedMs / safeStageIntervalMs), safeStepCount - 1),
      isLongRunning: safeElapsedMs >= longRunningMs,
      progressRatio: Math.min(MAX_UNCONFIRMED_PROGRESS, Math.max(0.08, safeElapsedMs / (safeStageIntervalMs * safeStepCount) * MAX_UNCONFIRMED_PROGRESS)),
    };
  }

  const rawStepIndex = Math.floor(safeElapsedMs / safeStageIntervalMs);
  const activeStepIndex = Math.min(rawStepIndex, safeStepCount - 1);
  const progressRatio = Math.min(
    MAX_UNCONFIRMED_PROGRESS,
    Math.max(0.08, ((safeElapsedMs / safeStageIntervalMs) / safeStepCount) * MAX_UNCONFIRMED_PROGRESS),
  );

  return {
    activeStepIndex,
    isLongRunning: safeElapsedMs >= longRunningMs,
    progressRatio,
  };
}
