import { expect, test, type Page } from "@playwright/test";

const responsiveWidths = [320, 360, 390, 768, 1024, 1280, 1440] as const;

test.describe("public activation clarity", () => {
  test("prioritizes a useful free example without availability dead ends", async ({ page }) => {
    await page.goto("/");

    const primaryAction = page.getByRole("link", { name: /explore (?:an )?example critique/i }).first();
    await expect(primaryAction).toBeVisible();
    await expect(primaryAction).toHaveAttribute("href", "/learn");
    await expect(page.getByText("Review availability", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Mode availability", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/example critique—not an analysis of your work/i).first()).toBeVisible();
  });

  for (const width of responsiveWidths) {
    test(`keeps repaired public routes inside the ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const route of ["/", "/projects", "/community"] as const) {
        await page.goto(route);
        await expect(page.locator("h1")).toBeVisible();
        await expectNoHorizontalDocumentOverflow(page);
      }
    });
  }

  test("keeps cookie preferences clear of the sign-up action", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/auth?mode=sign-up");

    const notice = page.getByRole("region", { name: "Cookie preferences" });
    const accountAction = page.getByRole("button", { name: /create account|continue with google/i }).first();
    await expect(notice).toBeVisible();
    await expect(accountAction).toBeVisible();

    const [noticeBox, actionBox] = await Promise.all([notice.boundingBox(), accountAction.boundingBox()]);
    expect(noticeBox).not.toBeNull();
    expect(actionBox).not.toBeNull();
    expect(rectanglesOverlap(noticeBox!, actionBox!)).toBe(false);
  });

  test("keeps cookie preferences clear of mobile navigation and restores menu focus", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/");

    const notice = page.getByRole("region", { name: "Cookie preferences" });
    const menu = page.locator(".landing-mobile-menu > summary");
    await expect(notice).toBeVisible();
    await expect(menu).toBeVisible();

    const [noticeBox, menuBox] = await Promise.all([notice.boundingBox(), menu.boundingBox()]);
    expect(noticeBox).not.toBeNull();
    expect(menuBox).not.toBeNull();
    expect(rectanglesOverlap(noticeBox!, menuBox!)).toBe(false);

    await notice.getByRole("button", { name: "Accept" }).click();
    await expect(notice).toBeHidden();
    await menu.click();
    await expect(page.locator(".landing-mobile-menu")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator(".landing-mobile-menu")).not.toHaveAttribute("open", "");
    await expect(menu).toBeFocused();

    await menu.click();
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "How it works" }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(page.locator(".landing-mobile-menu")).not.toHaveAttribute("open", "");
  });

  test("preserves the free learning path with reduced motion and forced colors", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /design critique/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /explore (?:an )?example critique/i }).first()).toBeVisible();
    await expect(page.locator(".target-cursor-wrapper")).toHaveCount(0);
    await expectNoHorizontalDocumentOverflow(page);
  });

  test("reflows the public journey at 200 percent zoom", async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 900 });
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });

    await expect(page.getByRole("heading", { name: /design critique/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /explore (?:an )?example critique/i }).first()).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);
  });

  test("keeps a truthful free example available without JavaScript", async ({ baseURL, browser }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /design critique/i }).first()).toBeVisible();
    await expect(page.getByText(/example critique—not an analysis of your work/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /explore (?:an )?example critique/i }).first()).toHaveAttribute("href", "/learn");

    await context.close();
  });

  test("gives the closed Community route one useful return action", async ({ page }) => {
    await page.goto("/community");

    await expect(page.getByRole("heading", { name: /private practice comes first/i })).toBeVisible();
    const returnActions = page.locator(".community-gated-actions a");
    await expect(returnActions).toHaveCount(1);
    await expect(returnActions.first()).toHaveAttribute("href", /#(example|critique-preview)$/);
  });

  test("offers a clear recovery path for unknown public routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    await expect(page.getByRole("heading", { name: /does not lead anywhere yet/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /explore the example critique/i })).toHaveAttribute("href", "/#critique-preview");
  });
});

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

function rectanglesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  return !(
    first.x + first.width <= second.x
    || second.x + second.width <= first.x
    || first.y + first.height <= second.y
    || second.y + second.height <= first.y
  );
}
