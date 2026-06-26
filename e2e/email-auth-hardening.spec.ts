import { expect, test, type Page } from "@playwright/test";

const useFirebaseFlow = process.env.E2E_AUTH_MODE === "firebase";
const testEmail = process.env.E2E_EMAIL ?? "designer@iroguide.test";

test.describe("manual email auth hardening", () => {
  test.skip(useFirebaseFlow, "Local E2E auth is required for deterministic hardening checks.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(page.getByRole("heading", { name: /sign in with your email and password/i })).toBeVisible();
  });

  test("shows forgot-password feedback without disclosing account existence", async ({ page }) => {
    await fillEmail(page, testEmail);

    await page.getByRole("button", { name: /forgot password\? send reset link/i }).click();

    await expect(authStatus(page)).toHaveText(/if an iroguide account exists for that email, a reset link has been sent/i);
    await expect(authError(page)).toHaveCount(0);
  });

  test("requires an email before password reset requests", async ({ page }) => {
    await page.getByRole("button", { name: /forgot password\? send reset link/i }).click();

    await expect(authError(page)).toHaveText(/enter your email before requesting a password reset/i);
    await expect(authStatus(page)).toHaveCount(0);
  });

  test("temporarily locks repeated password reset requests", async ({ page }) => {
    await fillEmail(page, `reset-lockout-${Date.now()}@iroguide.test`);

    await requestPasswordReset(page);
    await requestPasswordReset(page);
    await requestPasswordReset(page);
    await page.getByRole("button", { name: /forgot password\? send reset link/i }).click();

    await expect(authError(page)).toHaveText(/too many failed attempts\. try again in about 30 minutes/i);
  });

  test("temporarily locks repeated failed sign-in attempts", async ({ page }) => {
    await fillEmail(page, `signin-lockout-${Date.now()}@iroguide.test`);
    await page.getByLabel(/^Password$/i).fill("wrong-password");

    for (let attempt = 1; attempt < 5; attempt += 1) {
      await page.getByRole("button", { name: /^sign in/i }).click();
      await expect(authError(page)).toHaveText(/the email or password is incorrect/i);
    }

    await page.getByRole("button", { name: /^sign in/i }).click();

    await expect(authError(page)).toHaveText(/too many failed attempts\. try again in about 10 minutes/i);
  });
});

async function fillEmail(page: Page, email: string) {
  await page.getByLabel(/^Email$/i).fill(email);
}

async function requestPasswordReset(page: Page) {
  await page.getByRole("button", { name: /forgot password\? send reset link/i }).click();
  await expect(authStatus(page)).toHaveText(/if an iroguide account exists for that email, a reset link has been sent/i);
}

function authError(page: Page) {
  return page.locator(".email-auth-form .form-error");
}

function authStatus(page: Page) {
  return page.locator(".email-auth-form .form-success");
}
