import { expect, test } from "@playwright/test";
import { signInWithEmail } from "./auth-helpers";

test("stops free-launch users before the critique workflow begins", async ({ page }) => {
  const reviewRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/reviews")) reviewRequests.push(request.url());
  });

  await signInWithEmail(page, "free-launch@iroguide.test", "iroguide-e2e-password");
  await page.goto("/review/new");

  const unavailableNotice = page.getByRole("region", { name: /critique is unavailable during the free launch/i });
  await expect(unavailableNotice.getByRole("heading", { name: /critique is unavailable during the free launch/i })).toBeVisible();
  await expect(unavailableNotice.getByText(/your existing critique history and drafts remain available/i)).toBeVisible();
  await expect(unavailableNotice.getByRole("link", { name: /^dashboard$/i })).toBeVisible();
  await expect(unavailableNotice.getByRole("link", { name: /^community$/i })).toBeVisible();
  await expect(unavailableNotice.getByRole("link", { name: /read the docs/i })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /start critique/i })).toHaveCount(0);
  expect(reviewRequests).toEqual([]);
});
