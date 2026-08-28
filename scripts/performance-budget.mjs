import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const budgets = Object.freeze({
  "/": { cls: 0.1, lcpMs: 3_000, scriptBytes: 900_000, totalBytes: 2_500_000 },
  "/learn": { cls: 0.1, lcpMs: 3_000, scriptBytes: 900_000, totalBytes: 4_000_000 },
  "/auth/sign-in": { cls: 0.1, lcpMs: 3_000, scriptBytes: 700_000, totalBytes: 1_500_000 },
});

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.PERFORMANCE_BASE_URL ?? process.env.SMOKE_BASE_URL ?? "");
  if (!baseUrl) throw new Error("PERFORMANCE_BASE_URL or SMOKE_BASE_URL is required.");
  const reportPath = process.env.PERFORMANCE_REPORT_PATH ?? "artifacts/performance-budget.json";
  const browser = await chromium.launch();
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1365, height: 768 } });
  const samples = [];

  try {
    for (const [route, budget] of Object.entries(budgets)) {
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__iroguideVitals = { cls: 0, lcpMs: 0 };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) window.__iroguideVitals.lcpMs = Math.max(window.__iroguideVitals.lcpMs, entry.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__iroguideVitals.cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
      if (!response?.ok()) throw new Error(`${route} returned ${response?.status() ?? "no response"}.`);
      await page.waitForTimeout(1_000);
      const metrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType("resource");
        const transfer = (entry) => Number(entry.transferSize || entry.encodedBodySize || 0);
        return {
          cls: window.__iroguideVitals?.cls ?? null,
          lcpMs: window.__iroguideVitals?.lcpMs ?? null,
          scriptBytes: resources.filter((entry) => entry.initiatorType === "script").reduce((total, entry) => total + transfer(entry), 0),
          totalBytes: resources.reduce((total, entry) => total + transfer(entry), 0),
        };
      });
      const result = evaluatePerformanceSample(route, metrics, budget);
      samples.push(result);
      console.log(`${result.ok ? "PASS" : "FAIL"} ${route} - LCP=${Math.round(metrics.lcpMs ?? 0)}ms CLS=${Number(metrics.cls ?? 0).toFixed(3)} JS=${metrics.scriptBytes}B total=${metrics.totalBytes}B`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const report = { baseUrl, budgets, checkedAt: new Date().toISOString(), samples };
  const fullPath = resolve(reportPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Performance budget report: ${fullPath}`);
  if (samples.some((sample) => !sample.ok)) process.exitCode = 1;
}

export function evaluatePerformanceSample(route, metrics, budget) {
  const failures = [];
  if (typeof metrics.lcpMs !== "number" || metrics.lcpMs <= 0) failures.push("LCP was not observed");
  else if (metrics.lcpMs > budget.lcpMs) failures.push(`LCP ${Math.round(metrics.lcpMs)}ms exceeds ${budget.lcpMs}ms`);
  if (typeof metrics.cls !== "number") failures.push("CLS was not observed");
  else if (metrics.cls > budget.cls) failures.push(`CLS ${metrics.cls.toFixed(3)} exceeds ${budget.cls}`);
  if (metrics.scriptBytes > budget.scriptBytes) failures.push(`script bytes ${metrics.scriptBytes} exceed ${budget.scriptBytes}`);
  if (metrics.totalBytes > budget.totalBytes) failures.push(`total bytes ${metrics.totalBytes} exceed ${budget.totalBytes}`);
  return { route, metrics, budget, failures, ok: failures.length === 0 };
}

function normalizeBaseUrl(value) { return value.trim().replace(/\/+$/, ""); }

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
