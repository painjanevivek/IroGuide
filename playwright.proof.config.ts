import { defineConfig, devices } from "@playwright/test";

const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
const baseURL = configuredBaseUrl || "http://127.0.0.1:3300";
const serverPort = new URL(baseURL).port || "3000";
const jsonReport = process.env.FREE_LAUNCH_PLAYWRIGHT_REPORT ?? "artifacts/free-launch-proof/accessibility-device.json";

export default defineConfig({
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: jsonReport }],
    ["html", { open: "never", outputFolder: "playwright-report/free-launch-proof" }],
  ],
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  testMatch: "free-launch-accessibility-device.spec.ts",
  timeout: 90_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: configuredBaseUrl ? undefined : {
    command: `npm run dev -- --webpack --hostname 127.0.0.1 --port ${serverPort}`,
    env: {
      ...process.env,
      IROGUIDE_GUIDED_LEARNING_ENABLED: "true",
      IROGUIDE_LAUNCH_PROFILE: "free",
      NEXT_PUBLIC_E2E_LOCAL_AUTH: "true",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "android-chromium-emulation", use: { ...devices["Pixel 7"] } },
    { name: "iphone-webkit-emulation", use: { ...devices["iPhone 15"] } },
  ],
});
