import { expect, test } from "@playwright/test";

test("hydrates the app shell in Boneyard capture mode", async ({ page }) => {
  const hydrationErrors: string[] = [];
  const collectHydrationError = (message: string) => {
    if (message.includes("Hydration failed")) hydrationErrors.push(message);
  };

  page.on("console", (message) => {
    if (message.type() === "error") collectHydrationError(message.text());
  });
  page.on("pageerror", (error) => collectHydrationError(error.message));
  await page.addInitScript(() => Object.assign(window, { __BONEYARD_BUILD: true }));

  await page.goto("/");
  await expect(page.locator('[data-boneyard="iroguide-route-home"]')).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});
