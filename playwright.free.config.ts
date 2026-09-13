import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3101";

export default defineConfig({
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  testMatch: ["free-mode-review.spec.ts", "public-activation.spec.ts", "free-learning.spec.ts"],
  timeout: 90_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
    env: {
      ...process.env,
      IROGUIDE_LAUNCH_PROFILE: "free",
      IROGUIDE_CAPABILITY_GUIDED_LEARNING: "true",
      NEXT_PUBLIC_E2E_LOCAL_AUTH: "true",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
  projects: [
    {
      name: "chromium-free-launch",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
