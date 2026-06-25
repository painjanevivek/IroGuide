import { describe, expect, it } from "vitest";
import { getProgressFlowSnapshot } from "./progress-flow";

describe("progress flow", () => {
  it("shows useful staged progress without claiming completion before confirmation", () => {
    const snapshot = getProgressFlowSnapshot({
      elapsedMs: 60_000,
      stageIntervalMs: 1000,
      status: "running",
      stepCount: 4,
    });

    expect(snapshot.activeStepIndex).toBe(3);
    expect(snapshot.progressRatio).toBeLessThan(1);
    expect(snapshot.progressRatio).toBeCloseTo(0.88);
  });

  it("only reaches full progress once the operation succeeds", () => {
    const snapshot = getProgressFlowSnapshot({
      elapsedMs: 1200,
      status: "success",
      stepCount: 4,
    });

    expect(snapshot.activeStepIndex).toBe(3);
    expect(snapshot.progressRatio).toBe(1);
  });

  it("flags long-running tasks without changing the terminal result", () => {
    const snapshot = getProgressFlowSnapshot({
      elapsedMs: 30_000,
      longRunningMs: 25_000,
      status: "error",
      stepCount: 5,
    });

    expect(snapshot.isLongRunning).toBe(true);
    expect(snapshot.progressRatio).toBeLessThan(1);
  });
});
