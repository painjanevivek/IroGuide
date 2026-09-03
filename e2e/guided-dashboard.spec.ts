import { expect, test, type Page, type Route } from "@playwright/test";
import { signInWithEmail } from "./auth-helpers";

test.describe("guided dashboard", () => {
  test("gives a new account one clear artifact-producing next step", async ({ page }) => {
    await mockGuide(page, guide("new-account"));
    await signIn(page);
    await dismissCookieNotice(page);

    await expect(page.getByRole("heading", { name: /confidence-building learning path/i })).toBeVisible();
    await expect(page.getByText(/0 of 4 foundation steps/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /choose my path/i }).first()).toBeVisible();
    await expect(page.locator(".guide-checklist li")).toHaveCount(4);
    await expect(page.locator(".progress-grid")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /clear learning history/i })).toHaveAttribute("href", /tool=data/);
  });

  test("renders an explicit locked recovery state without hiding data controls", async ({ page }) => {
    await page.route("**/api/dashboard/guide", (route) => route.fulfill({ status: 423, contentType: "application/json", json: { error: "Account data is locked while deletion finishes." } }));
    await signIn(page);
    await dismissCookieNotice(page);

    await expect(page.getByRole("heading", { name: /temporarily locked/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /retry guide/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /account controls/i })).toBeVisible();
  });

  test("keeps the last guide visible when the device goes offline", async ({ page, context }) => {
    await mockGuide(page, guide("sample-in-progress"));
    await signIn(page);
    await dismissCookieNotice(page);
    await expect(page.getByRole("heading", { name: /continue where you left off/i })).toBeVisible();

    await context.setOffline(true);
    await expect(page.getByText(/offline—showing the last loaded guide/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /continue sample/i }).first()).toBeVisible();
    await context.setOffline(false);
  });

  test("opens the requested learning tool instead of a dead destination", async ({ page }) => {
    await mockGuide(page, guide("sample-complete"));
    await signIn(page);
    await dismissCookieNotice(page);
    await page.getByRole("link", { name: /start self-review/i }).first().click();

    await expect(page).toHaveURL(/\/learn\?tool=self-review#practice/);
    await expect(page.getByRole("button", { name: "Self-review", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("keeps action order and controls within a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await mockGuide(page, guide("brief-ready"));
    await signIn(page);
    await dismissCookieNotice(page);

    await expect(page.getByRole("heading", { name: /brief ready for a future critique/i })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await captureEvidence(page, "guided-dashboard-mobile.png");
  });

  test("keeps cached history readable through partial sync and a filtered-empty state", async ({ page, context }) => {
    await mockGuide(page, guide("existing-reviews"));
    await signIn(page);
    await seedSavedReview(page, "dashboard@iroguide.test");
    await page.reload();
    await dismissCookieNotice(page);

    await expect(page.getByRole("heading", { name: /keep the thread/i })).toBeVisible();
    await page.getByLabel("Filter critiques").selectOption("logo");
    await expect(page.getByText(/no critiques match this filter/i)).toBeVisible();
    await page.getByRole("button", { name: /clear filter/i }).click();
    await expect(page.getByRole("link", { name: /open full critique/i })).toBeVisible();

    await context.setOffline(true);
    await expect(page.getByText(/readable history, partial sync/i)).toBeVisible();
    await captureEvidence(page, "guided-dashboard-partial-sync-desktop.png");
    await context.setOffline(false);
  });

  test("uses a dimensionally stable guide skeleton while session data resolves", async ({ page }) => {
    await page.route("**/api/dashboard/guide", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      await json(route, guide("new-account"));
    });
    await signIn(page);
    await expect(page.locator(".dashboard-guide.is-loading")).toBeVisible();
    await expect(page.getByRole("heading", { name: /confidence-building learning path/i })).toBeVisible();
  });

  test("renders the remaining saved-progress and entitlement matrix states", async ({ page }) => {
    let current = guide("onboarding-incomplete");
    await page.route("**/api/dashboard/guide", (route) => json(route, current));
    await signIn(page);
    await expect(page.getByRole("heading", { name: /continue your saved setup/i })).toBeVisible();

    current = guide("access-requested");
    await page.reload();
    await expect(page.getByRole("heading", { name: /access interest is recorded/i })).toBeVisible();

    current = guide("invited");
    await page.reload();
    await expect(page.getByRole("heading", { name: /provider remains paused/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view access status/i }).first()).toBeVisible();
  });
});

async function signIn(page: Page) {
  await signInWithEmail(page, "dashboard@iroguide.test", "iroguide-e2e-password");
}

async function mockGuide(page: Page, value: ReturnType<typeof guide>) {
  await page.route("**/api/dashboard/guide", (route) => json(route, value));
  await page.route("**/api/product-evidence", (route) => json(route, { accepted: true }, 202));
}

function guide(state: "new-account" | "onboarding-incomplete" | "sample-in-progress" | "sample-complete" | "brief-ready" | "access-requested" | "invited" | "existing-reviews") {
  const actions = {
    "new-account": { id: "finish-onboarding", eyebrow: "Step 1 of 4", title: "Set up a confidence-building learning path.", description: "Choose three short preferences so the examples match your work.", href: "/onboarding", label: "Choose my path", artifact: "Saved learning path", completed: 0 },
    "onboarding-incomplete": { id: "finish-onboarding", eyebrow: "Step 1 of 4", title: "Continue your saved setup.", description: "Your earlier choices remain private and editable.", href: "/onboarding", label: "Continue setup", artifact: "Saved learning path", completed: 0 },
    "sample-in-progress": { id: "continue-sample", eyebrow: "Step 2 of 4", title: "Continue where you left off.", description: "Return to the evidence you revealed.", href: "/learn#practice", label: "Continue sample", artifact: "Completed sample reflection", completed: 1 },
    "sample-complete": { id: "start-self-review", eyebrow: "Step 3 of 4", title: "Apply the same standard to your own work.", description: "Your answers produce at most three priorities.", href: "/learn?tool=self-review#practice", label: "Start self-review", artifact: "Saved self-review priorities", completed: 2 },
    "brief-ready": { id: "request-access", eyebrow: "Free path complete", title: "You have a brief ready for a future critique.", description: "Record revocable interest without an upload or provider call.", href: "/learn?tool=access#practice", label: "Review access options", artifact: "Revocable access interest", completed: 4 },
    "access-requested": { id: "view-access", eyebrow: "Free path complete", title: "Your access interest is recorded.", description: "No email or provider job was created.", href: "/learn?tool=access#practice", label: "View access status", artifact: "Revocable access interest", completed: 4 },
    "invited": { id: "view-access", eyebrow: "Access recorded", title: "Your invite is saved, but the provider remains paused.", description: "Invitation state cannot override the provider gate.", href: "/learn?tool=access#practice", label: "View access status", artifact: "Saved access state", completed: 4 },
    "existing-reviews": { id: "open-review-history", eyebrow: "Owned history", title: "Continue from your latest saved critique.", description: "Review evidence already attached to your account.", href: "/dashboard#recent-reviews", label: "Open recent critique", artifact: "Reviewed saved critique", completed: 4 },
  } as const;
  const action = actions[state];
  const { completed, ...nextAction } = action;
  return {
    schemaVersion: 1, state, cohort: "beginner-designer", nextAction, completionCount: completed, reviewCount: 0, recentActivity: [],
    checklist: [
      { id: "choose-path", label: "Choose your learning path", outcome: "Role saved", completed: completed >= 1, href: "/onboarding" },
      { id: "inspect-sample", label: "Inspect visible evidence", outcome: "First fix chosen", completed: completed >= 2, href: "/learn#practice" },
      { id: "practice-rubric", label: "Run a self-review", outcome: "Priorities derived", completed: completed >= 3, href: "/learn?tool=self-review#practice" },
      { id: "prepare-brief", label: "Prepare critique context", outcome: "Brief ready", completed: completed >= 4, href: "/learn?tool=brief#practice" },
    ],
  };
}

async function seedSavedReview(page: Page, email: string) {
  const userId = `e2e_${email.trim().toLowerCase().replace(/[^\w.-]/g, "_")}`;
  const reviewId = "dashboard-history";
  const documentId = `${userId}_${reviewId}`;
  const timestamp = "2026-08-28T10:00:00.000Z";
  const document = {
    id: documentId, userId, category: "website", categoryLabel: "Website / landing page", provider: "demo", status: "complete", savedAt: timestamp, updatedAt: timestamp, syncState: "local",
    review: {
      id: reviewId, createdAt: timestamp, overallScore: 7, summary: "A private cached critique remains readable during recovery.", strengths: ["The primary action is visible."],
      scores: [{ label: "Hierarchy", score: 7 }], rubricVersion: "dashboard-e2e-v1", annotations: [], followUps: ["What should I refine next?"], provider: "demo",
      issues: [{ id: "issue-1", category: "Hierarchy", score: 7, priority: "medium", observation: "The heading has a visible role.", impact: "Readers identify the message.", recommendation: "Keep the heading dominant.", actions: ["Preserve the current scale."] }],
      checklist: [{ label: "Preserve the current scale.", priority: "medium" }],
    },
  };
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify([value])), { key: `iroguide:dashboard-reviews:v1:${encodeURIComponent(userId)}`, value: document });
}

async function dismissCookieNotice(page: Page) {
  const notice = page.getByRole("region", { name: "Cookie preferences" });
  if (await notice.isVisible()) await notice.getByRole("button", { name: "Accept" }).click();
}

async function json(route: Route, value: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", json: value });
}

async function captureEvidence(page: Page, name: string) {
  const directory = process.env.ACTIVATION_EVIDENCE_DIR;
  if (directory) await page.screenshot({ path: `${directory}/${name}`, fullPage: true });
}
