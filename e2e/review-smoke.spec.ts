import { expect, test, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const useFirebaseFlow = process.env.E2E_AUTH_MODE === "firebase";
const testEmail = process.env.E2E_EMAIL ?? "designer@iroguide.test";
const testPassword = process.env.E2E_PASSWORD ?? "iroguide-e2e-password";

test("signs in, submits a review, and shows private source-image status on the dashboard", async ({ page }, testInfo) => {
  if (useFirebaseFlow && (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD)) {
    test.skip(true, "Set E2E_EMAIL and E2E_PASSWORD for Firebase-backed Playwright runs.");
  }

  if (!useFirebaseFlow) {
    await mockLocalReviewApi(page);
  }

  const imagePath = testInfo.outputPath("fixtures", "source-design.png");
  await writePngFixture(imagePath);

  await signIn(page);

  await page.getByRole("link", { name: /new review/i }).first().click();
  await expect(page.getByRole("heading", { name: /upload your design/i })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(imagePath);
  await expect(page.getByText(/source-design\.png is ready for critique/i)).toBeVisible();
  await page.getByRole("button", { name: /continue/i }).click();

  await page.getByLabel(/target audience/i).fill("Independent portfolio reviewers");
  await page.getByLabel(/^Purpose/i).fill("Evaluate a portfolio hero image before launch");
  await page.getByLabel(/style direction/i).fill("Editorial, confident, minimal");
  await page.getByLabel(/primary goal/i).fill("Make the first impression feel credible");
  await page.getByLabel(/specific concern/i).fill("Check whether the focal point is obvious.");
  await page.getByRole("button", { name: /choose feedback/i }).click();

  await page.getByRole("radio", { name: /mentor/i }).check();
  await page.getByRole("button", { name: /review details/i }).click();
  await page.getByRole("button", { name: /start critique/i }).click();

  await expect(page.getByRole("heading", { name: /your critique is ready/i })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: /saved with image|saved to dashboard|retry account sync/i })).toBeVisible();

  await page.getByRole("link", { name: /^dashboard$/i }).click();
  await expect(page.getByText(/saved source images are loaded from private account storage/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /keep the thread/i })).toBeVisible();
});

async function signIn(page: Page) {
  await page.goto("/auth/sign-in");
  await page.getByLabel(/^Email$/i).fill(testEmail);
  await page.getByLabel(/^Password$/i).fill(testPassword);
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/private signed-in workspace/i)).toBeVisible();
}

async function mockLocalReviewApi(page: Page) {
  await page.route("**/api/reviews", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        persistence: {
          imageSavedToAccount: true,
          savedToAccount: true,
          sourceImage: {
            contentType: "image/png",
            originalName: "source-design.png",
            size: 178,
            storagePath: "users/e2e/reviews/e2e-source/source.png",
            uploadedAt: new Date().toISOString(),
          },
        },
        review: {
          annotations: [],
          checklist: [
            { label: "Increase the contrast between headline and supporting copy.", priority: "high" },
            { label: "Keep the primary action visually dominant.", priority: "medium" },
          ],
          createdAt: new Date().toISOString(),
          followUps: ["What should I adjust first?"],
          id: `e2e-${Date.now()}`,
          issues: [
            {
              actions: ["Raise the headline contrast.", "Reduce one competing decorative element."],
              category: "Hierarchy",
              id: "issue-1",
              impact: "Reviewers may miss the main promise on the first scan.",
              observation: "The layout has a clear center, but the supporting elements compete with the headline.",
              priority: "high",
              recommendation: "Give the headline a stronger contrast relationship and simplify nearby details.",
              score: 6,
            },
          ],
          overallScore: 7,
          provider: "demo",
          rubricVersion: "e2e-smoke-v1",
          scores: [
            { label: "Hierarchy", score: 7 },
            { label: "Clarity", score: 7 },
            { label: "Trust", score: 6 },
          ],
          strengths: ["The image has a focused visual direction."],
          summary: "This portfolio hero has a credible foundation. Tightening contrast will make the first read faster.",
        },
      },
      status: 200,
    });
  });
}

async function writePngFixture(path: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXElEQVR4nO3PQQ3AIADAQEDJ6KcH" +
    "NxxYwLSV8D29d94D+GgDcAHYAHYAHYAHYAHYAHYAHYAHYAHYAHYAHYAHYAHYAHYAHYAHYAHYA" +
    "HYAHYAHYAHYAHYAPYD3lwG+qEB3tAZAAAAABJRU5ErkJggg==",
    "base64",
  ));
}
