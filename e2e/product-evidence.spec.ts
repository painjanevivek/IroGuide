import { expect, test } from "@playwright/test";
import { signInWithEmail } from "./auth-helpers";

test("research journey is bounded, honest, and responsive", async ({ page }) => {
  await signInWithEmail(page, "researcher@iroguide.test", "iroguide-e2e-password");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/research-feedback", async (route) => {
    const payload = route.request().postDataJSON();
    expect(payload.feedback).toEqual({
      clarity: "clear",
      cohort: "beginner-designer",
      nextStep: "read-docs",
      researchConsent: true,
    });
    expect(Object.keys(payload.feedback).sort()).toEqual(["clarity", "cohort", "nextStep", "researchConsent"]);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ submitted: true }) });
  });

  await page.goto("/research");
  await expect(page.getByRole("heading", { name: "Help shape the free learning loop." })).toBeVisible();
  await expect(page.getByText("It does not upload a design, request critique, or promise access to a live AI provider.")).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(0);
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await page.getByLabel("Research consent").check();
  await page.getByRole("button", { name: "Submit feedback" }).click();
  await expect(page.getByRole("heading", { name: "Thank you for the signal." })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("operator insights distinguish disabled collection from measured zero", async ({ page }) => {
  await signInWithEmail(page, "admin@iroguide.test", "iroguide-e2e-password");
  await page.route("**/api/admin/insights", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        report: {
          collectionMode: "noop",
          environment: "development",
          eventCount: 0,
          feedback: { responseCount: 0, researchConsentCount: 0, byCohort: {}, byClarity: {} },
          from: "2026-07-25T00:00:00.000Z",
          generatedAt: "2026-08-24T00:00:00.000Z",
          metrics: {},
          partial: false,
          uniqueAccountCount: 0,
        },
      }),
    });
  });

  await page.goto("/admin/insights");
  await expect(page.getByRole("heading", { name: "Free-launch evidence." })).toBeVisible();
  await expect(page.getByText("Collection is safely disabled")).toBeVisible();
  await expect(page.getByText("Not observed", { exact: true })).toHaveCount(6);
  await expect(page.getByText("Observed event total", { exact: true })).toHaveCount(0);
});
