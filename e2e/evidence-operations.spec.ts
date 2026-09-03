import { expect, test, type Route } from "@playwright/test";
import { signInWithEmail } from "./auth-helpers";

test.describe("evidence and access operations", () => {
  test("downloads a versioned private owner export without opening external work", async ({ page }) => {
    const externalEffects: string[] = [];
    page.on("request", (request) => { if (/email|provider|checkout|billing/i.test(new URL(request.url()).pathname)) externalEffects.push(request.url()); });
    await page.route("**/api/dashboard/guide", (route) => json(route, dashboardGuide()));
    await page.route("**/api/account/export", async (route) => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ schemaVersion: 1 });
      await route.fulfill({ status: 200, contentType: "application/json", headers: { "Cache-Control": "private, no-store", "Content-Disposition": "attachment; filename=\"iroguide-account-export-2026-08-28.json\"" }, body: JSON.stringify({ schemaVersion: 1, profile: { email: "owner@iroguide.test" }, reviews: [] }) });
    });
    await signInWithEmail(page, "owner@iroguide.test", "iroguide-e2e-password");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download my data/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("iroguide-account-export-2026-08-28.json");
    expect(externalEffects).toEqual([]);
  });

  test("filters and records an audited operator decision without sending email", async ({ page }) => {
    let status = "interested";
    const decisions: unknown[] = [];
    const emailRequests: string[] = [];
    page.on("request", (request) => { if (/email/i.test(new URL(request.url()).pathname)) emailRequests.push(request.url()); });
    await page.route("**/api/dashboard/guide", (route) => json(route, dashboardGuide()));
    await page.route("**/api/admin/access-interest**", async (route) => {
      if (route.request().method() === "GET") return json(route, { partial: false, records: status === "interested" ? [candidate()] : [] });
      const command = route.request().postDataJSON();
      decisions.push(command);
      status = command.decision === "approve" ? "invited" : command.decision;
      return json(route, { record: { ...candidate(), revision: 1, status } });
    });
    await signInWithEmail(page, "operator@iroguide.test", "iroguide-e2e-password");
    await page.goto("/admin/access-interest");

    await expect(page.getByRole("heading", { name: /decide invites without opening/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /website/i })).toBeVisible();
    await captureEvidence(page, "access-operations-desktop.png");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await captureEvidence(page, "access-operations-mobile.png");
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText(/approval recorded with immutable audit/i)).toBeVisible();
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ targetUserId: "candidate-user", expectedRevision: 0, decision: "approve", reasonCode: "cohort-fit" });
    expect(emailRequests).toEqual([]);
  });
});

function candidate() {
  return { targetUserId: "candidate-user", revision: 0, cohort: "freelancer", preferredCategory: "website", clientWorkIntent: "client-safe-only", contactPermission: true, status: "interested", createdAt: "2026-08-27T10:00:00.000Z", updatedAt: "2026-08-27T10:00:00.000Z" };
}

function dashboardGuide() {
  return { schemaVersion: 1, state: "new-account", cohort: "freelancer", nextAction: { id: "finish-onboarding", eyebrow: "Step 1 of 4", title: "Choose a path.", description: "Three choices.", href: "/onboarding", label: "Choose path", artifact: "Saved path" }, checklist: [
    { id: "choose-path", label: "Choose path", outcome: "Saved", completed: false, href: "/onboarding" },
    { id: "inspect-sample", label: "Inspect sample", outcome: "Chosen", completed: false, href: "/learn" },
    { id: "practice-rubric", label: "Self review", outcome: "Priorities", completed: false, href: "/learn?tool=self-review" },
    { id: "prepare-brief", label: "Brief", outcome: "Ready", completed: false, href: "/learn?tool=brief" },
  ], completionCount: 0, reviewCount: 0, recentActivity: [] };
}

async function json(route: Route, value: unknown, status = 200) { await route.fulfill({ status, contentType: "application/json", json: value }); }

async function captureEvidence(page: import("@playwright/test").Page, name: string) {
  const directory = process.env.ACTIVATION_EVIDENCE_DIR;
  if (directory) await page.screenshot({ path: `${directory}/${name}`, fullPage: true });
}
