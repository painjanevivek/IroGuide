import { describe, expect, it } from "vitest";
import { deriveDashboardGuide, type GuideInput } from "./dashboard-guide";

const now = "2026-08-28T10:00:00.000Z";
const base: GuideInput = {
  role: "beginner-designer" as const, onboardingStatus: "completed" as const, sampleProgress: [], selfReviews: [], briefs: [], access: null,
  reviewCount: 0, reviewDraftCount: 0, activeReviewJob: false, comparisonDraft: false, caseStudyDraft: false, aiCritique: false,
};

describe("dashboard guide", () => {
  it.each([
    ["onboarding-incomplete", { onboardingStatus: "in-progress" }, "finish-onboarding"],
    ["sample-in-progress", { sampleProgress: [{ checkedActionIds: [], reflectionChoice: null, revealedFindingIds: ["finding-1"], updatedAt: now }] }, "continue-sample"],
    ["sample-complete", { sampleProgress: [sampleDone()] }, "start-self-review"],
    ["self-review-in-progress", { sampleProgress: [sampleDone()], selfReviews: [{ category: "ui", status: "draft", updatedAt: now }] }, "continue-self-review"],
    ["self-review-complete", { sampleProgress: [sampleDone()], selfReviews: [{ category: "ui", status: "completed", updatedAt: now }] }, "start-brief"],
    ["brief-in-progress", { sampleProgress: [sampleDone()], selfReviews: [{ category: "ui", status: "completed", updatedAt: now }], briefs: [{ category: "ui", status: "draft", updatedAt: now }] }, "continue-brief"],
    ["brief-ready", { sampleProgress: [sampleDone()], selfReviews: [{ category: "ui", status: "completed", updatedAt: now }], briefs: [{ category: "ui", status: "ready", updatedAt: now }] }, "request-access"],
    ["access-requested", { sampleProgress: [sampleDone()], selfReviews: [{ category: "ui", status: "completed", updatedAt: now }], briefs: [{ category: "ui", status: "ready", updatedAt: now }], access: { status: "interested", preferredCategory: "ui", updatedAt: now } }, "view-access"],
    ["existing-reviews", { sampleProgress: [sampleDone()], selfReviews: [{ category: "ui", status: "completed", updatedAt: now }], briefs: [{ category: "ui", status: "ready", updatedAt: now }], reviewCount: 2 }, "open-review-history"],
  ] satisfies Array<[string, Partial<GuideInput>, string]>)("derives %s", (state, changes, actionId) => {
    expect(deriveDashboardGuide({ ...base, ...changes })).toMatchObject({ state, nextAction: { id: actionId } });
  });

  it("prioritizes recoverable live work and never exposes private text in activity", () => {
    const guide = deriveDashboardGuide({ ...base, activeReviewJob: true, aiCritique: true, briefs: [{ category: "poster", status: "draft", updatedAt: now }] });
    expect(guide.nextAction.id).toBe("continue-review-job");
    expect(JSON.stringify(guide.recentActivity)).not.toContain("client");
  });

  it("returns exactly four bounded checklist outcomes", () => {
    const guide = deriveDashboardGuide({ ...base, sampleProgress: [sampleDone()] });
    expect(guide.checklist).toHaveLength(4);
    expect(guide.completionCount).toBe(2);
  });
});

function sampleDone() { return { checkedActionIds: ["action-1"], reflectionChoice: "ready-to-apply", revealedFindingIds: ["finding-1"], updatedAt: now }; }
