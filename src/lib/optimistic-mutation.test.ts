import { describe, expect, it } from "vitest";
import { createOptimisticMutationScope, runOptimisticMutation } from "./optimistic-mutation";

describe("optimistic mutation", () => {
  it("commits optimistic state immediately and reconciles on success", async () => {
    let state = { count: 0, synced: false };

    const result = await runOptimisticMutation({
      apply: (previous: typeof state) => ({ ...previous, count: previous.count + 1 }),
      commit: (next) => {
        state = next;
      },
      getState: () => state,
      reconcile: (_result: { synced: boolean }, optimistic) => ({ ...optimistic, synced: true }),
      run: async () => ({ synced: true }),
    });

    expect(result.status).toBe("success");
    expect(state).toEqual({ count: 1, synced: true });
  });

  it("rolls back to the previous state on failure", async () => {
    let state = { saved: false };

    const result = await runOptimisticMutation({
      apply: () => ({ saved: true }),
      commit: (next) => {
        state = next;
      },
      getState: () => state,
      run: async () => {
        throw new Error("network down");
      },
    });

    expect(result.status).toBe("error");
    expect(state).toEqual({ saved: false });
  });

  it("supports retry after a rolled-back failure", async () => {
    let state = { liked: false };

    await runOptimisticMutation({
      apply: () => ({ liked: true }),
      commit: (next) => {
        state = next;
      },
      getState: () => state,
      run: async () => {
        throw new Error("first attempt failed");
      },
    });

    const retryResult = await runOptimisticMutation({
      apply: () => ({ liked: true }),
      commit: (next) => {
        state = next;
      },
      getState: () => state,
      run: async () => undefined,
    });

    expect(retryResult.status).toBe("success");
    expect(state).toEqual({ liked: true });
  });

  it("ignores stale failures when a newer mutation owns the same key", async () => {
    const scope = createOptimisticMutationScope();
    const staleToken = scope.start("post-1:liked");
    const currentToken = scope.start("post-1:liked");
    let state = { liked: true };

    const result = await runOptimisticMutation({
      apply: () => ({ liked: false }),
      commit: (next) => {
        state = next;
      },
      getState: () => state,
      isCurrent: () => scope.isCurrent(staleToken),
      run: async () => {
        throw new Error("late failure");
      },
    });

    expect(result.status).toBe("error");
    expect(scope.isCurrent(currentToken)).toBe(true);
    expect(state).toEqual({ liked: false });
  });
});
