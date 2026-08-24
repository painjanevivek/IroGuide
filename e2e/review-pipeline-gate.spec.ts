import { expect, test } from "@playwright/test";

test("keeps inactive review pipeline UI and mutations unreachable", async ({ page, request }) => {
  const pageResponse = await page.goto("/internal/review-pipeline");
  expect(pageResponse?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /durable review pipeline/i })).toHaveCount(0);

  const uploadResponse = await request.post("/api/review-uploads", {
    data: { contentType: "image/png" },
    headers: { Origin: "http://127.0.0.1:3107" },
  });
  expect(uploadResponse.status()).toBe(404);

  await page.goto("/");
  await expect(page.locator('a[href="/internal/review-pipeline"]')).toHaveCount(0);
});
