import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DashboardGuide } from "@/domain/dashboard-guide";
import { GuidedNextAction } from "./guided-next-action";

describe("guided next action", () => {
  it("renders the artifact, bounded checklist, and categorical activity", () => {
    const markup = renderToStaticMarkup(<GuidedNextAction error="" guide={guide()} loading={false} offline={false} onRetry={() => undefined} status={null} />);
    expect(markup).toContain("Saved learning path");
    expect(markup).toContain("4 foundation steps");
    expect(markup).toContain("Sample critique practice");
    expect(markup).not.toContain("private brief text");
  });

  it("keeps an actionable locked state", () => {
    const markup = renderToStaticMarkup(<GuidedNextAction error="Account data is locked." guide={null} loading={false} offline={false} onRetry={() => undefined} status={423} />);
    expect(markup).toContain("temporarily locked");
    expect(markup).toContain("Retry guide");
  });
});

function guide(): DashboardGuide {
  return {
    schemaVersion: 1,
    state: "new-account",
    cohort: "beginner-designer",
    nextAction: { id: "finish-onboarding", eyebrow: "Step 1 of 4", title: "Choose a path.", description: "Three short choices.", href: "/onboarding", label: "Choose my path", artifact: "Saved learning path" },
    checklist: [
      { id: "choose-path", label: "Choose your learning path", outcome: "Role saved", completed: false, href: "/onboarding" },
      { id: "inspect-sample", label: "Inspect visible evidence", outcome: "First fix chosen", completed: false, href: "/learn#practice" },
      { id: "practice-rubric", label: "Run a self-review", outcome: "Priorities derived", completed: false, href: "/learn?tool=self-review#practice" },
      { id: "prepare-brief", label: "Prepare critique context", outcome: "Brief ready", completed: false, href: "/learn?tool=brief#practice" },
    ],
    completionCount: 0,
    reviewCount: 0,
    recentActivity: [{ id: "sample-1", type: "sample", label: "Sample critique practice", category: null, at: "2026-08-28T10:00:00.000Z" }],
  };
}
