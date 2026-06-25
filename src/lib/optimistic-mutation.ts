export type OptimisticMutationToken = {
  key: string;
  version: number;
};

export type OptimisticMutationResult<TResult> =
  | { status: "success"; result: TResult }
  | { status: "error"; error: unknown };

export function createOptimisticMutationScope() {
  const versions = new Map<string, number>();

  return {
    start(key: string): OptimisticMutationToken {
      const version = (versions.get(key) ?? 0) + 1;
      versions.set(key, version);
      return { key, version };
    },
    isCurrent(token: OptimisticMutationToken) {
      return versions.get(token.key) === token.version;
    },
    finish(token: OptimisticMutationToken) {
      if (versions.get(token.key) === token.version) {
        versions.delete(token.key);
      }
    },
  };
}

export async function runOptimisticMutation<TState, TResult>({
  apply,
  commit,
  getState,
  isCurrent = () => true,
  reconcile,
  rollback,
  run,
}: {
  apply: (previous: TState) => TState;
  commit: (next: TState) => void;
  getState: () => TState;
  isCurrent?: () => boolean;
  reconcile?: (result: TResult, optimisticState: TState) => TState;
  rollback?: (previous: TState, error: unknown) => TState;
  run: () => Promise<TResult>;
}): Promise<OptimisticMutationResult<TResult>> {
  const previousState = getState();
  const optimisticState = apply(previousState);
  commit(optimisticState);

  try {
    const result = await run();
    if (isCurrent() && reconcile) {
      commit(reconcile(result, optimisticState));
    }
    return { status: "success", result };
  } catch (error) {
    if (isCurrent()) {
      commit(rollback ? rollback(previousState, error) : previousState);
    }
    return { status: "error", error };
  }
}
