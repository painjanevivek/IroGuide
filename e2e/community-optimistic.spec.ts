import { expect, test, type Locator, type Page } from "@playwright/test";

const useFirebaseFlow = process.env.E2E_AUTH_MODE === "firebase";
const testEmail = process.env.E2E_EMAIL ?? "designer@iroguide.test";
const testPassword = process.env.E2E_PASSWORD ?? "iroguide-e2e-password";
const e2ePostId = "e2e-community-optimistic";

test.describe("community optimistic interactions", () => {
  test.skip(useFirebaseFlow, "Local E2E community fixtures are required for deterministic optimistic checks.");

  test("rolls back a failed reaction, retries, and reconciles comments after reload", async ({ page }) => {
    await signIn(page);
    await resetCommunityState(page);

    await page.goto("/community");
    const post = communityPost(page);
    await expect(post.getByRole("heading", { name: /optimistic critique thread/i })).toBeVisible();

    const likeButton = post.locator('[data-analytics-event="community_like_click"]');
    await failNextInteraction(page, "liked");
    await likeButton.click();

    await expect(communityShareState(page)).toContainText(/updating community action/i);
    await expect(likeButton).toHaveAttribute("aria-pressed", "true");
    await expect(communityShareState(page)).toContainText(/e2e community interaction failed/i);
    await expect(likeButton).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: /retry/i }).click();
    await expect(communityShareState(page)).toContainText(/reaction added/i);
    await expect(likeButton).toHaveAttribute("aria-pressed", "true");

    await post.locator('[data-analytics-event="community_comments_open"]').click();
    const commentBody = `The retry path feels clear ${Date.now()}.`;
    await post.getByPlaceholder(/add a specific, useful comment/i).fill(commentBody);
    await post.getByRole("button", { name: /post comment/i }).click();

    const comment = post.locator(".community-comment").filter({ hasText: commentBody });
    await expect(comment).toContainText(/sending/i);
    await expect(comment).not.toContainText(/sending/i);

    await expect.poll(() => readStoredLike(page)).toBe(true);
    await page.reload();
    const reloadedPost = communityPost(page);
    await expect(reloadedPost.getByRole("heading", { name: /optimistic critique thread/i })).toBeVisible();
    await expect(reloadedPost.locator('[data-analytics-event="community_like_click"]')).toHaveAttribute("aria-pressed", "true");

    await reloadedPost.locator('[data-analytics-event="community_comments_open"]').click();
    await expect(reloadedPost.locator(".community-comment").filter({ hasText: commentBody })).toBeVisible();
  });
});

async function signIn(page: Page) {
  await page.goto("/auth/sign-in");
  await page.getByLabel(/^Email$/i).fill(testEmail);
  await page.getByLabel(/^Password$/i).fill(testPassword);
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function resetCommunityState(page: Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem("iroguide-community-interactions");
    window.localStorage.removeItem("iroguide:e2e-community-comments:v1");
    window.localStorage.removeItem("iroguide:e2e-community-fail-next-interaction");
  });
}

async function failNextInteraction(page: Page, key: "liked" | "saved") {
  await page.evaluate(
    ({ postId, interactionKey }) => {
      window.localStorage.setItem("iroguide:e2e-community-fail-next-interaction", `${postId}:${interactionKey}`);
    },
    { interactionKey: key, postId: e2ePostId },
  );
}

async function readStoredLike(page: Page) {
  return page.evaluate((postId) => {
    const rawValue = window.localStorage.getItem("iroguide-community-interactions");
    if (!rawValue) return false;
    const interactions = JSON.parse(rawValue) as Record<string, { liked?: boolean }>;
    return interactions[postId]?.liked === true;
  }, e2ePostId);
}

function communityPost(page: Page): Locator {
  return page.locator(`#${e2ePostId}`);
}

function communityShareState(page: Page): Locator {
  return page.locator(".community-share-state");
}
