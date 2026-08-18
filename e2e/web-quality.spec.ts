import { expect, test } from "@playwright/test";

test.describe("public web quality", () => {
  test("publishes complete preview and install metadata", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/IroGuide/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /design/i);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");

    const manifestResponse = await page.request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);
    await expect(manifestResponse.json()).resolves.toMatchObject({
      name: "IroGuide",
      display: "standalone",
      theme_color: "#09090f",
    });

    const socialImageResponse = await page.request.get("/opengraph-image");
    expect(socialImageResponse.ok()).toBe(true);
    expect(socialImageResponse.headers()["content-type"]).toContain("image/png");
  });

  test("supports keyboard skip navigation and a narrow viewport without page overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#app-content")).toBeFocused();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });

  test("does not mount the decorative cursor when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForTimeout(1_100);

    await expect(page.locator(".target-cursor-wrapper")).toHaveCount(0);
    await expect.poll(() => page.locator("html").getAttribute("data-motion-enhanced")).toBe("basic");
  });

  test("keeps the landing journey useful when JavaScript enhancements are unavailable", async ({ baseURL, browser }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");

    await expect(page.getByRole("heading", { name: /design critique/i }).first()).toBeVisible();
    await expect(page.getByText("This illustrative preview shows how IroGuide moves from evidence to a useful next move.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Review my design" }).first()).toHaveAttribute("href", "/review/new");
    await expect(page.getByRole("link", { name: "Start a real review" })).toHaveAttribute("href", "/review/new");

    await context.close();
  });

  test("offers a labelled, keyboard-operable critique preview with a review route", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Explore an example critique" }).click();
    await expect(page.locator("#critique-preview")).toBeInViewport();

    const focusInsight = page.getByRole("button", { name: /Locate friction/i });
    await focusInsight.focus();
    await page.keyboard.press("Space");

    await expect(focusInsight).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "Find what slows the read" })).toBeVisible();
    await expect(page.getByText("Outcome: turn a vague reaction into one clear priority.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Start a real review" })).toHaveAttribute("href", "/review/new");
  });
});
