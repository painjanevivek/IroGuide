import { expect, test } from "@playwright/test";
import { signInWithEmail } from "./auth-helpers";

test("stops free-launch users before the critique workflow begins", async ({ page }) => {
  const email = "free-launch@iroguide.test";
  const reviewRequests: string[] = [];
  const sourceImageRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/reviews") reviewRequests.push(request.url());
    if (request.url().includes("firebasestorage.googleapis.com") || request.url().includes("/__e2e__/private-storage/")) {
      sourceImageRequests.push(request.url());
    }
  });

  await signInWithEmail(page, email, "iroguide-e2e-password");
  await expect(page.getByRole("link", { name: /review availability/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /new review|review a design|practice with a new design|continue draft/i })).toHaveCount(0);

  await page.locator('summary[aria-label="Open workspace menu"]').first().click();
  await expect(page.getByRole("link", { name: /review availability/i }).last()).toBeVisible();

  await seedSavedReview(page, email);
  await page.reload();
  await expect(page.getByRole("heading", { name: /keep the thread/i })).toBeVisible();
  await page.getByRole("link", { name: /open critique/i }).click();
  await expect(page.getByRole("heading", { name: /further ai critique is unavailable/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /compare version|send|generate improvement plan/i })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("link", { name: /review availability/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /start review/i })).toHaveCount(0);

  await page.goto("/profile");
  await expect(page.getByRole("link", { name: /review availability/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /new review/i })).toHaveCount(0);

  await page.goto("/review/new");

  const unavailableNotice = page.getByRole("region", { name: /critique is unavailable during the free launch/i });
  await expect(unavailableNotice.getByRole("heading", { name: /critique is unavailable during the free launch/i })).toBeVisible();
  await expect(unavailableNotice.getByText(/your existing critique history and drafts remain available/i)).toBeVisible();
  await expect(unavailableNotice.getByRole("link", { name: /^dashboard$/i })).toBeVisible();
  await expect(unavailableNotice.getByRole("link", { name: /^community$/i })).toHaveCount(0);
  await expect(unavailableNotice.getByRole("link", { name: /read the docs/i })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /start critique/i })).toHaveCount(0);
  expect(reviewRequests).toEqual([]);
  expect(sourceImageRequests).toEqual([]);

  await page.goto("/community");
  await expect(page.getByRole("heading", { name: /private practice comes first/i })).toBeVisible();
  await expect(page.getByText(/no community posts or interactions are available/i)).toBeVisible();
  await expect(page.locator(".community-social-shell")).toHaveCount(0);
});

async function seedSavedReview(page: import("@playwright/test").Page, email: string) {
  const userId = `e2e_${email.trim().toLowerCase().replace(/[^\w.-]/g, "_")}`;
  const reviewId = "free-launch-history";
  const documentId = `${userId}_${reviewId}`;
  const timestamp = "2026-08-11T00:00:00.000Z";
  const document = {
    id: documentId,
    userId,
    category: "website",
    categoryLabel: "Website / landing page",
    provider: "demo",
    status: "complete",
    savedAt: timestamp,
    updatedAt: timestamp,
    syncState: "cloud",
    sourceImage: {
      storagePath: `users/${userId}/reviews/${documentId}/source.png`,
      contentType: "image/png",
      size: 128,
      originalName: "historical-design.png",
      uploadedAt: timestamp,
    },
    review: {
      id: reviewId,
      createdAt: timestamp,
      overallScore: 7,
      summary: "The saved review remains useful while new critique generation is paused.",
      strengths: ["The visual hierarchy has a clear starting point."],
      scores: [{ label: "Hierarchy", score: 7 }],
      rubricVersion: "free-launch-e2e-v1",
      issues: [{
        id: "issue-1",
        category: "Hierarchy",
        score: 7,
        priority: "medium",
        observation: "The primary heading has a visible role.",
        impact: "Readers can identify the main message.",
        recommendation: "Keep the heading dominant.",
        actions: ["Preserve the current heading scale."],
      }],
      annotations: [],
      checklist: [{ label: "Preserve the current heading scale.", priority: "medium" }],
      followUps: ["What should I refine next?"],
      provider: "demo",
    },
  };

  await page.evaluate(({ cacheKey, cachedDocument }) => {
    localStorage.setItem(cacheKey, JSON.stringify([cachedDocument]));
  }, {
    cacheKey: `iroguide:dashboard-reviews:v1:${encodeURIComponent(userId)}`,
    cachedDocument: document,
  });
}
