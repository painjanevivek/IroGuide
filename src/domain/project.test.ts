import { describe, expect, it } from "vitest";
import { deriveProjectNextAction, emptyProjectArtifactCounts, projectCreateSchema, projectDeleteSchema, withProjectArtifactTotal } from "./project";

describe("project domain", () => {
  it("rejects unknown input fields and bounds mutations", () => {
    expect(projectCreateSchema.safeParse({ schemaVersion: 1, mutationId: "mutation-1", name: "Portfolio", category: null, goal: "", ownerId: "client" }).success).toBe(false);
    expect(projectDeleteSchema.safeParse({ schemaVersion: 1, expectedRevision: 0, mutationId: "mutation-1", transferToProjectId: "unsorted" }).success).toBe(true);
  });

  it("derives totals and useful next actions", () => {
    const empty = emptyProjectArtifactCounts();
    expect(deriveProjectNextAction({ status: "active", artifactCounts: empty })).toBe("start-learning");
    const populated = withProjectArtifactTotal({ ...empty, briefs: 1 });
    expect(populated.total).toBe(1);
    expect(deriveProjectNextAction({ status: "active", artifactCounts: populated })).toBe("continue-project");
  });
});
