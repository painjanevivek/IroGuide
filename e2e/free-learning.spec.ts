import { expect, test, type Page, type Route } from "@playwright/test";
import { waitForAppHydration } from "./auth-helpers";

const guestStorageKey = "iroguide:guest-sample-progress:v1";

test.describe("truthful free learning", () => {
  test("keeps the complete example readable without JavaScript", async ({ baseURL, browser }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/learn");

    await expect(page.getByRole("heading", { name: /learn to see the decision/i })).toBeVisible();
    await expect(page.getByText(/example critique—not an analysis of your work/i).first()).toBeVisible();
    await expect(page.locator(".public-findings > li")).toHaveCount(3);
    await expect(page.getByText(/no image upload or personalized analysis/i)).toBeVisible();
    await context.close();
  });

  test("saves and resets bounded guest sample progress", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/learn#practice");
    await waitForAppHydration(page);
    await dismissCookieNotice(page);

    const exercise = page.getByRole("heading", { name: /practice with form together/i });
    await expect(exercise).toBeVisible();
    await page.getByLabel(/event type becomes fragile/i).check();
    await page.getByRole("button", { name: /reveal the evidence/i }).click();
    await expect(page.locator(".learning-practice-shell").getByText(/supporting line is narrow/i)).toBeVisible();
    await page.getByRole("button", { name: /choose this first fix/i }).click();
    await page.getByLabel(/apply the first fix/i).check();

    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), guestStorageKey);
    expect(saved).toMatchObject({ sampleId: "form-together-friendly", sampleVersion: "v1", reflectionChoice: "ready-to-apply" });
    expect(Date.parse(saved.updatedAt) - Date.parse(saved.createdAt)).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);

    await page.getByRole("button", { name: /reset example/i }).click();
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), guestStorageKey)).toBeNull();
    await expectNoHorizontalDocumentOverflow(page);
    await captureEvidence(page, "free-learning-guest-mobile.png");
  });

  test("completes the signed-in learning tools without forbidden external work", async ({ page }) => {
    const forbiddenRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (/\/(review-uploads|review-jobs|community|billing|checkout|email)(\/|$)/.test(url.pathname)) forbiddenRequests.push(url.pathname);
    });
    await mockLearningApis(page);
    await signIn(page, "/learn#practice");
    await dismissCookieNotice(page);

    await page.getByLabel(/interface proves depth/i).check();
    await page.getByRole("button", { name: /reveal the evidence/i }).click();
    await page.getByRole("button", { name: /choose this first fix/i }).click();
    await page.getByLabel(/apply the first fix/i).check();

    await page.getByRole("button", { name: "Self-review" }).click();
    await page.getByRole("button", { name: /start self-review/i }).click();
    for (let index = 0; index < 4; index += 1) {
      await page.locator(".self-review-list fieldset").nth(index).getByLabel("Yes", { exact: true }).check();
      await expect(page.getByText(`${index + 1} / 4 answered`)).toBeVisible();
    }
    await page.getByRole("button", { name: /complete self-review/i }).click();
    await expect(page.getByRole("button", { name: /self-review complete/i })).toBeDisabled();

    await page.getByRole("button", { name: "Brief builder" }).click();
    const briefBuilder = page.getByRole("region", { name: /write the context before asking for critique/i });
    await briefBuilder.getByLabel(/category/i).selectOption("ui");
    await briefBuilder.getByLabel(/audience/i).fill("People comparing a clear mobile workflow");
    await briefBuilder.getByLabel(/purpose/i).fill("Help a first-time user finish one key task");
    await briefBuilder.getByLabel(/^goal/i).fill("Make the next action unmistakable");
    await briefBuilder.getByLabel(/main concern/i).fill("The primary action may compete with secondary controls");
    await page.getByRole("button", { name: /mark brief ready/i }).click();
    await expect(page.getByText(/your brief is ready/i)).toBeVisible();

    await page.getByRole("button", { name: "Review access" }).click();
    await page.getByLabel(/preferred category/i).selectOption("ui");
    await page.getByLabel(/personal or practice work/i).check();
    await page.getByLabel(/allow IroGuide to record/i).check();
    await page.getByRole("button", { name: /record review interest/i }).click();
    await expect(page.getByText(/access interest is recorded/i)).toBeVisible();
    await page.getByRole("button", { name: /revoke interest now/i }).click();
    await expect(page.getByRole("heading", { name: /tell us whether future review access fits/i })).toBeVisible();

    expect(forbiddenRequests).toEqual([]);
    await captureEvidence(page, "free-learning-complete-desktop.png");
  });

  test("supports keyboard focus, forced colors, reduced motion, and 200 percent zoom", async ({ browserName, page }) => {
    await page.setViewportSize({ width: 720, height: 900 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/learn#practice");
    await waitForAppHydration(page);
    await dismissCookieNotice(page);
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });

    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    if (browserName !== "chromium") await skipLink.focus();
    else await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(page.getByText(/example critique—not an analysis/i).first()).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);
  });
});

async function mockLearningApis(page: Page) {
  const now = "2026-08-28T10:00:00.000Z";
  const experience = {
    schemaVersion: 1, revision: 0, primaryRole: "ui-ux-designer", primaryGoal: "improve-ui", preferredMode: "mentor",
    selectedCategories: ["ui"], onboardingStatus: "completed", onboardingStep: 3, programVersion: "free-activation-v1",
    steps: {}, nextStep: "inspect-sample", dismissedHints: [], onboardingCompletedAt: now, lastVisitedAt: now,
    completedAt: null, createdAt: now, updatedAt: now,
  };
  let sampleProgress: Array<Record<string, unknown>> = [];
  let selfReview: Record<string, unknown> | null = null;
  let brief: Record<string, unknown> | null = null;
  let access: Record<string, unknown> | null = null;

  await page.route("**/api/account/experience", async (route) => {
    if (route.request().method() === "GET") return json(route, { experience, sampleProgress, accessInterest: access });
    const body = route.request().postDataJSON() as Record<string, unknown> & { sampleProgress?: Record<string, unknown> };
    if (body.sampleProgress) sampleProgress = [{ ...body.sampleProgress, revision: sampleProgress.length, completedAt: now, createdAt: now, updatedAt: now }];
    experience.revision += 1;
    return json(route, { experience, sampleProgress, accessInterest: access });
  });
  await page.route("**/api/self-reviews", async (route) => {
    const method = route.request().method();
    if (method === "GET") return json(route, { records: selfReview ? [selfReview] : [] });
    if (method === "DELETE") { selfReview = null; return json(route, { deleted: 1 }); }
    const body = route.request().postDataJSON() as Record<string, unknown> & { changes?: Record<string, unknown> };
    const base = selfReview ?? { id: body.id, schemaVersion: 1, revision: 0, rubricVersion: "rubric-v1", category: body.category, goalLabel: "", responses: [], priorityItemIds: [], status: "draft", createdAt: now, updatedAt: now };
    selfReview = { ...base, ...(body.changes ?? {}), revision: Number(base.revision) + (method === "PATCH" ? 1 : 0), updatedAt: now };
    return json(route, { record: selfReview });
  });
  await page.route("**/api/design-briefs", async (route) => {
    const method = route.request().method();
    if (method === "GET") return json(route, { records: brief ? [brief] : [] });
    if (method === "DELETE") { brief = null; return json(route, { deleted: 1 }); }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    brief = { ...body, mutationId: undefined, expectedRevision: undefined, revision: Number(brief?.revision ?? -1) + 1, createdAt: now, updatedAt: now, importedFromLegacy: false };
    delete brief.mutationId;
    delete brief.expectedRevision;
    return json(route, { record: brief });
  });
  await page.route("**/api/access-interest", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    access = route.request().method() === "DELETE" ? null : {
      schemaVersion: 1, revision: 0, programVersion: body.programVersion, cohort: "ui-ux-designer",
      preferredCategory: body.preferredCategory, clientWorkIntent: body.clientWorkIntent, contactPermission: true,
      status: "interested", createdAt: now, updatedAt: now,
    };
    return json(route, { record: access });
  });
  await page.route("**/api/product-evidence", (route) => json(route, { accepted: true }, 202));
}

async function signIn(page: Page, destination: string) {
  await page.goto(`/auth/sign-in?next=${encodeURIComponent(destination)}`);
  await waitForAppHydration(page);
  await page.getByLabel(/^Email$/i).fill("learning@iroguide.test");
  await page.getByLabel(/^Password$/i).fill("iroguide-e2e-password");
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(/\/learn#practice$/);
}

async function dismissCookieNotice(page: Page) {
  const notice = page.getByRole("region", { name: "Cookie preferences" });
  if (await notice.isVisible()) await notice.getByRole("button", { name: "Accept" }).click();
}

async function json(route: Route, value: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", json: value });
}

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function captureEvidence(page: Page, name: string) {
  const directory = process.env.ACTIVATION_EVIDENCE_DIR;
  if (directory) await page.screenshot({ path: `${directory}/${name}`, fullPage: true });
}
