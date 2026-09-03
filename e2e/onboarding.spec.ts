import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import { waitForAppHydration } from "./auth-helpers";

const guestStorageKey = "iroguide:guest-sample-progress:v1";

test.describe("role-aware onboarding", () => {
  test.skip(process.env.E2E_AUTH_MODE === "firebase", "Local auth keeps onboarding persistence checks deterministic.");

  test("preserves the sign-up destination, imports guest progress, and completes three decisions", async ({ page }) => {
    const api = await mockAccountExperience(page);
    const guestProgress = {
      schemaVersion: 1,
      sampleId: "form-together-friendly",
      sampleVersion: "v1",
      activeFindingId: "finding-1",
      revealedFindingIds: ["finding-1"],
      checkedActionIds: ["action-1"],
      reflectionChoice: "needs-practice",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await page.addInitScript(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), {
      key: guestStorageKey,
      progress: guestProgress,
    });

    await page.goto("/auth/sign-up?next=%2Fonboarding");
    await waitForAppHydration(page);
    await page.getByLabel(/^Name$/i).fill("Ada Designer");
    await page.getByLabel(/^Email$/i).fill("onboarding@iroguide.test");
    await page.getByLabel(/^Password$/i).fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    const roleHeading = page.getByRole("heading", { name: /what kind of designer/i });
    await expect(roleHeading).toBeFocused();
    await expectNoOverlap(page.getByRole("region", { name: /cookie preferences/i }), roleHeading);
    await captureEvidence(page, "onboarding-role-desktop.png");
    await page.getByLabel(/UI\/UX designer/i).check();
    await page.getByRole("button", { name: /save and continue/i }).click();

    await expect(page.getByRole("heading", { name: /what do you want to improve/i })).toBeFocused();
    await page.getByLabel(/improve UI and UX decisions/i).check();
    await page.getByLabel(/^UI$/i).check();
    await page.getByLabel(/^Website$/i).check();
    await page.getByRole("button", { name: /save and continue/i }).click();

    await expect(page.getByRole("heading", { name: /how should guidance speak/i })).toBeFocused();
    await expect(page.getByText(/mentor · recommended/i)).toBeVisible();
    await page.getByRole("button", { name: /finish setup/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    expect(api.patches).toHaveLength(3);
    expect(api.patches[0].guestProgress).toMatchObject({ sampleId: "form-together-friendly" });
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), guestStorageKey)).toBeNull();
    expect(api.experience).toMatchObject({
      primaryRole: "ui-ux-designer",
      primaryGoal: "improve-ui",
      preferredMode: "mentor",
      selectedCategories: ["ui", "website"],
      onboardingStatus: "completed",
      onboardingStep: 3,
    });
  });

  test("resumes a skipped setup and supports browser back plus an offline retry state", async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAccountExperience(page, {
      onboardingStatus: "skipped",
      onboardingStep: 1,
      primaryRole: "freelancer",
      preferredMode: "direct",
    });
    await signIn(page, "/onboarding");

    await expect(page.getByRole("heading", { name: /what do you want to improve/i })).toBeVisible();
    await expectNoOverlap(
      page.getByRole("region", { name: /cookie preferences/i }),
      page.getByRole("heading", { name: /what do you want to improve/i }),
    );
    await captureEvidence(page, "onboarding-resume-mobile.png");
    await page.getByLabel(/check work before handoff/i).check();
    await page.getByRole("button", { name: /save and continue/i }).click();
    await expect(page.getByRole("heading", { name: /how should guidance speak/i })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: /what do you want to improve/i })).toBeFocused();

    await context.setOffline(true);
    await page.getByRole("button", { name: /save and continue/i }).click();
    await expect(page.getByText(/offline/i)).toBeVisible();
    await context.setOffline(false);
  });

  test("rejects an external auth return destination", async ({ page }) => {
    await page.goto("/auth/sign-in?next=https%3A%2F%2Fevil.example%2Fsteal");
    await waitForAppHydration(page);
    await page.getByLabel(/^Email$/i).fill("safe-return@iroguide.test");
    await page.getByLabel(/^Password$/i).fill("iroguide-e2e-password");
    await page.getByRole("button", { name: /^sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(page.url()).not.toContain("evil.example");
  });

  test("edits a completed path without an invalid completed-to-in-progress transition", async ({ page }) => {
    const api = await mockAccountExperience(page, {
      onboardingStatus: "completed",
      onboardingStep: 3,
      primaryRole: "freelancer",
      primaryGoal: "pre-client-check",
      preferredMode: "direct",
    });
    await signIn(page, "/onboarding?mode=edit");
    await page.getByLabel(/beginner designer/i).check();
    await page.getByRole("button", { name: /save and continue/i }).click();

    await expect(page.getByRole("heading", { name: /what do you want to improve/i })).toBeVisible();
    expect(api.patches[0].changes).not.toHaveProperty("onboardingStatus");
    expect(api.experience).toMatchObject({ onboardingStatus: "completed", primaryRole: "beginner-designer" });
  });
});

async function signIn(page: Page, destination: string) {
  await page.goto(`/auth/sign-in?next=${encodeURIComponent(destination)}`);
  await waitForAppHydration(page);
  await page.getByLabel(/^Email$/i).fill("resume@iroguide.test");
  await page.getByLabel(/^Password$/i).fill("iroguide-e2e-password");
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

async function mockAccountExperience(page: Page, overrides: Record<string, unknown> = {}) {
  const state = {
    experience: {
      schemaVersion: 1,
      revision: 0,
      primaryRole: null,
      primaryGoal: null,
      preferredMode: "mentor",
      selectedCategories: [],
      onboardingStatus: "not-started",
      onboardingStep: 0,
      programVersion: "free-activation-v1",
      steps: {},
      nextStep: "choose-path",
      dismissedHints: [],
      onboardingCompletedAt: null,
      lastVisitedAt: "2026-08-28T10:00:00.000Z",
      completedAt: null,
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
      ...overrides,
    },
    sampleProgress: [] as Array<Record<string, unknown>>,
    accessInterest: null,
    patches: [] as Array<Record<string, unknown>>,
  };

  await page.route("**/api/account/experience", async (route: Route) => {
    if (route.request().method() === "GET") return fulfill(route, state);
    const body = route.request().postDataJSON() as Record<string, unknown> & { changes?: Record<string, unknown>; guestProgress?: Record<string, unknown> };
    state.patches.push(body);
    state.experience = {
      ...state.experience,
      ...(body.changes ?? {}),
      revision: state.experience.revision + 1,
      updatedAt: new Date().toISOString(),
      lastVisitedAt: new Date().toISOString(),
    };
    if (body.guestProgress) {
      state.sampleProgress = [{
        ...body.guestProgress,
        revision: 0,
        completedAt: null,
      }];
    }
    return fulfill(route, state);
  });
  return state;
}

async function fulfill(route: Route, state: { experience: object; sampleProgress: object[]; accessInterest: null }) {
  await route.fulfill({ status: 200, contentType: "application/json", json: {
    experience: state.experience,
    sampleProgress: state.sampleProgress,
    accessInterest: state.accessInterest,
  } });
}

async function captureEvidence(page: Page, name: string) {
  const directory = process.env.ACTIVATION_EVIDENCE_DIR;
  if (directory) await page.screenshot({ path: `${directory}/${name}`, fullPage: true });
}

async function expectNoOverlap(overlay: Locator, content: Locator) {
  const [overlayBox, contentBox] = await Promise.all([overlay.boundingBox(), content.boundingBox()]);
  expect(overlayBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect((overlayBox?.y ?? 0) + (overlayBox?.height ?? 0)).toBeLessThanOrEqual(contentBox?.y ?? 0);
}
