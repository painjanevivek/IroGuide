import { expect, test } from "@playwright/test";
import { waitForAppHydration } from "./auth-helpers";

const publicRoutes = ["/", "/learn", "/auth/sign-in"] as const;

for (const route of publicRoutes) {
  test(`${route} keeps its structural accessibility contract`, async ({ page }, testInfo) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await waitForAppHydration(page);

    const audit = await page.evaluate(() => {
      const visible = (element: Element) => {
        const style = window.getComputedStyle(element);
        const rectangle = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rectangle.width > 0 && rectangle.height > 0;
      };
      const unnamedControls = Array.from(document.querySelectorAll("button, input, select, textarea"))
        .filter(visible)
        .filter((element) => {
          if (element instanceof HTMLInputElement && element.type === "hidden") return false;
          const labelledBy = element.getAttribute("aria-labelledby");
          const ariaLabel = element.getAttribute("aria-label")?.trim();
          const labels = "labels" in element ? (element as HTMLInputElement).labels?.length ?? 0 : 0;
          const text = element.textContent?.trim();
          return !labelledBy && !ariaLabel && labels === 0 && !text;
        })
        .map((element) => element.outerHTML.slice(0, 160));
      const duplicateIds = Array.from(document.querySelectorAll<HTMLElement>("[id]"))
        .map((element) => element.id)
        .filter((id, index, ids) => id && ids.indexOf(id) !== index);
      const undersizedControls = Array.from(document.querySelectorAll<HTMLElement>("button, input:not([type='hidden']), select, textarea, a.button"))
        .filter(visible)
        .filter((element) => {
          const labelledTarget = element instanceof HTMLInputElement
            ? element.closest<HTMLElement>("label") ?? (element.labels?.[0] as HTMLElement | undefined)
            : undefined;
          const rectangle = (labelledTarget && visible(labelledTarget) ? labelledTarget : element).getBoundingClientRect();
          return rectangle.width < 24 || rectangle.height < 24;
        })
        .map((element) => ({
          height: Math.round((element.closest<HTMLElement>("label") ?? element).getBoundingClientRect().height),
          label: (element.getAttribute("aria-label") || element.textContent || element.getAttribute("name") || element.tagName).trim().slice(0, 80),
          width: Math.round((element.closest<HTMLElement>("label") ?? element).getBoundingClientRect().width),
        }));
      const overflowingElements = Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter(visible)
        .filter((element) => {
          const rectangle = element.getBoundingClientRect();
          return rectangle.right > document.documentElement.clientWidth + 1 || rectangle.left < -1;
        })
        .map((element) => ({
          className: element.className?.toString().slice(0, 100) ?? "",
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
          tag: element.tagName,
        }))
        .slice(0, 12);

      return {
        duplicateIds: [...new Set(duplicateIds)],
        h1Count: Array.from(document.querySelectorAll("h1")).filter(visible).length,
        imageWithoutAltCount: document.querySelectorAll("img:not([alt])").length,
        mainCount: Array.from(document.querySelectorAll("main")).filter(visible).length,
        overflowPixels: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        overflowingElements,
        undersizedControls,
        unnamedControls,
        viewport: { height: window.innerHeight, width: window.innerWidth },
      };
    });

    await testInfo.attach("drill-summary", { body: JSON.stringify({ route, ...audit }, null, 2), contentType: "application/json" });
    expect(audit.mainCount, "a visible main landmark").toBeGreaterThanOrEqual(1);
    expect(audit.h1Count, "exactly one visible page heading").toBe(1);
    expect(audit.imageWithoutAltCount, "all images expose alt text").toBe(0);
    expect(audit.duplicateIds, "DOM IDs remain unique").toEqual([]);
    expect(audit.unnamedControls, "form controls have accessible names").toEqual([]);
    expect(audit.undersizedControls, "action controls meet the WCAG 2.2 24px minimum").toEqual([]);
    expect(audit.overflowPixels, "the page has no horizontal viewport overflow").toBeLessThanOrEqual(1);
  });
}

test("keyboard skip navigation reaches the application content", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Keyboard drill runs once on the desktop project.");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForAppHydration(page);

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#app-content")).toBeFocused();
});

test("reduced-motion preference leaves enhancement in basic mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Reduced-motion drill runs once on the desktop project.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForAppHydration(page);
  await expect.poll(() => page.locator("html").getAttribute("data-motion-enhanced")).toBe("basic");
  await expect(page.locator(".target-cursor-wrapper")).toHaveCount(0);
});
