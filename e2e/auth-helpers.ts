import { expect, type Page } from "@playwright/test";

export async function signInWithEmail(page: Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  await waitForAppHydration(page);
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(password);
  const submit = page.getByRole("button", { name: /^sign in/i });
  await submit.click();
  const navigated = await page.waitForURL(/\/dashboard/, { timeout: 5_000 }).then(() => true).catch(() => false);
  if (!navigated) {
    let localSession = await page.evaluate(() => localStorage.getItem("iroguide:e2e-local-auth-user"));
    if (!localSession) {
      await submit.click();
      await expect.poll(() => page.evaluate(() => localStorage.getItem("iroguide:e2e-local-auth-user")), { timeout: 5_000 }).not.toBeNull();
      localSession = await page.evaluate(() => localStorage.getItem("iroguide:e2e-local-auth-user"));
    }
    expect(localSession).not.toBeNull();
    await page.goto("/dashboard").catch(async () => {
      await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    });
  }
  await expect(page).toHaveURL(/\/dashboard/);
  await dismissCookieConsent(page);
}

export async function waitForAppHydration(page: Page) {
  await expect.poll(
    () => page.locator("html").getAttribute("data-app-hydrated"),
    { message: "wait for the root client boundary to hydrate", timeout: 30_000 },
  ).toBe("true");
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
