import { describe, expect, it } from "vitest";
import { evaluateProbeResults, evaluateReadiness } from "./operational-synthetic-probe.mjs";

const ready = {
  ok: true,
  capabilities: { profile: "free", guidedLearning: true, liveCritique: false, improvementTracking: false, revisionComparison: false, followUpConversation: false, privatePortfolio: false, publicPortfolio: false, billing: false, productEvidence: true, bugReportEmail: false, community: false, reviewPipeline: false, sourceImageStorage: false },
  operations: { communityGate: "closed" },
};

describe("operational synthetic probe", () => {
  it("accepts the intentionally minimal healthy public readiness response", () => expect(evaluateReadiness({ ok: true })).toEqual([]));
  it("accepts only the intended free capability contract", () => expect(evaluateReadiness(ready)).toEqual([]));
  it("detects capability and Community drift", () => expect(evaluateReadiness({ ...ready, capabilities: { ...ready.capabilities, liveCritique: true }, operations: { communityGate: "open" } })).toEqual(expect.arrayContaining(["liveCritique must remain disabled", "Community gate must remain closed"])));
  it("returns the exact failed probe names", () => expect(evaluateProbeResults([{ name: "a", ok: true }, { name: "b", ok: false }])).toEqual(["b"]));
});
