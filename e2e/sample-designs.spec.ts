import { expect, test } from "@playwright/test";
import { signInWithEmail } from "./auth-helpers";

test("uses real sample artwork and matching critique context", async ({ page }) => {
  await signInWithEmail(page, "designer@iroguide.test", "iroguide-e2e-password");
  await page.getByRole("button", { name: /dismiss cookie notice/i }).click();
  await page.getByRole("link", { name: /new review/i }).first().click();

  const sampleImages = page.locator(".sample-card img");
  await expect(sampleImages).toHaveCount(3);
  await expect.poll(async () => sampleImages.evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth >= 200 && image.naturalHeight >= 120))).toBe(true);

  await page.getByRole("button", { name: /Fieldnote/i }).click();
  await expect(page.getByText("fieldnote-landing-page.png")).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/Fieldnote is ready for critique/i);
  await page.getByRole("button", { name: /continue/i }).click();

  await expect(page.getByLabel(/target audience/i)).toHaveValue("Product researchers and research operations teams");
  await expect(page.getByLabel(/^Purpose/i)).toHaveValue("Explain a collaborative research repository and encourage workspace creation");
  await expect(page.getByLabel(/style direction/i)).toHaveValue("Calm, editorial, credible, and product-led");
  await expect(page.getByLabel(/primary goal/i)).toHaveValue("Convert qualified visitors into new workspace sign-ups");
  await expect(page.getByRole("radio", { name: /website/i })).toBeChecked();
});
