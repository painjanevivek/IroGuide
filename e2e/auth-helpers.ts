import { expect, type Page } from "@playwright/test";

export async function signInWithEmail(page: Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
