import type { User } from "firebase/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDashboardGuide } from "./dashboard-guide-client";

describe("dashboard guide client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses owner authentication and no-store", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validGuide()), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadDashboardGuide(user())).resolves.toMatchObject({ state: "new-account", completionCount: 0 });
    expect(fetchMock).toHaveBeenCalledWith("/api/dashboard/guide", expect.objectContaining({ cache: "no-store", headers: { Authorization: "Bearer token" } }));
  });

  it("rejects unbounded or malformed guide responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...validGuide(), rawBrief: "private" }), { status: 200 })));
    await expect(loadDashboardGuide(user())).rejects.toMatchObject({ status: 503 });
  });
});

function user() { return { getIdToken: vi.fn().mockResolvedValue("token") } as unknown as User; }
function validGuide() {
  return {
    schemaVersion: 1, state: "new-account", cohort: "other",
    nextAction: { id: "finish-onboarding", eyebrow: "Step 1", title: "Choose a path", description: "Choose a path to continue.", href: "/onboarding", label: "Continue", artifact: "Saved path" },
    checklist: [
      { id: "choose-path", label: "Path", outcome: "Saved", completed: false, href: "/onboarding" },
      { id: "inspect-sample", label: "Sample", outcome: "Chosen", completed: false, href: "/learn#practice" },
      { id: "practice-rubric", label: "Rubric", outcome: "Priorities", completed: false, href: "/learn?tool=self-review#practice" },
      { id: "prepare-brief", label: "Brief", outcome: "Ready", completed: false, href: "/learn?tool=brief#practice" },
    ],
    completionCount: 0, reviewCount: 0, recentActivity: [],
  };
}
