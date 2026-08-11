import { expect, type Page } from "@playwright/test";

export async function signInWithEmail(page: Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await dismissCookieConsent(page);
}

async function dismissCookieConsent(page: Page) {
  const dismissButton = page.getByRole("button", { name: /dismiss cookie notice/i });

  try {
    await dismissButton.waitFor({ state: "visible", timeout: 2_000 });
  } catch {
    return;
  }

  await dismissButton.click();
  await expect(dismissButton).toBeHidden();
}
