import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const startedAt = new Date();
const baseUrl = normalizeBaseUrl(process.env.DAST_BASE_URL ?? process.env.SMOKE_BASE_URL ?? "https://iroguide.com");
const timeoutMs = Number(process.env.DAST_TIMEOUT_MS ?? 12_000);
const reportPath = process.env.DAST_REPORT_PATH ?? "artifacts/dast-prelaunch-report.json";
const requireReady = process.env.DAST_REQUIRE_READY === "true";
const failOnWarnings = process.env.DAST_FAIL_ON_WARNINGS === "true";
const externalOrigin = process.env.DAST_EXTERNAL_ORIGIN ?? "https://dast.invalid";

const publicRoutes = [
  "/",
  "/about",
  "/projects",
  "/pricing",
  "/community",
  "/contact",
  "/privacy",
  "/terms",
  "/beta",
  "/portfolio",
  "/auth",
  "/auth/sign-in",
  "/auth/sign-up",
  "/dashboard",
  "/profile",
  "/review/new",
];

const protectedApiRoutes = [
  { method: "POST", path: "/api/reviews", body: "{}" },
  { method: "POST", path: "/api/reviews/sync", body: "{\"documents\":[]}" },
  { method: "POST", path: "/api/follow-ups", body: "{}" },
  { method: "POST", path: "/api/comparisons", body: "{}" },
  { method: "POST", path: "/api/improvements", body: "{}" },
  { method: "DELETE", path: "/api/account" },
  { method: "DELETE", path: "/api/account/reviews" },
];

const postApiRoutes = protectedApiRoutes.filter((route) => route.method === "POST");
const results = [];

async function main() {
  console.log(`IroGuide prelaunch DAST target: ${baseUrl}`);

  for (const route of publicRoutes) {
    await checkPublicRoute(route);
  }

  await checkReadiness();

  for (const route of protectedApiRoutes) {
    await checkAuthGate(route);
    await checkCrossSiteBlock(route);
  }

  for (const route of postApiRoutes) {
    await checkContentTypeGate(route);
  }

  const report = {
    baseUrl,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    publicRoutes,
    apiRoutes: ["/api/readiness", ...protectedApiRoutes.map((route) => `${route.method} ${route.path}`)],
    results,
  };
  await writeReport(report);

  for (const result of results) {
    const status = result.ok ? "PASS" : result.severity === "warning" ? "WARN" : "FAIL";
    const suffix = result.detail ? ` - ${result.detail}` : "";
    console.log(`${status} [${result.severity}] ${result.name}${suffix}`);
  }

  const failed = results.filter((result) => !result.ok && (result.severity !== "warning" || failOnWarnings));
  console.log(`DAST report: ${resolve(reportPath)}`);
  console.log(`DAST summary: ${results.length - failed.length}/${results.length} checks passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function checkPublicRoute(path) {
  const name = `GET ${path}`;
  const response = await request(path, {
    headers: { "User-Agent": "IroGuide-prelaunch-DAST/1.0" },
    redirect: "follow",
  });

  if (!response.ok) {
    addResult(name, false, "medium", response.detail);
    return;
  }

  const statusOk = response.status >= 200 && response.status < 400;
  const headerProblems = getPageHeaderProblems(response.headers);
  addResult(name, statusOk && headerProblems.length === 0, "medium", [
    `status=${response.status}`,
    ...headerProblems,
  ].filter(Boolean).join("; "));
}

async function checkReadiness() {
  const response = await request("/api/readiness", {
    headers: { "User-Agent": "IroGuide-prelaunch-DAST/1.0" },
  });

  if (!response.ok) {
    addResult("GET /api/readiness", false, "medium", response.detail);
    return;
  }

  const payload = await readJson(response);
  const headerProblems = getApiHeaderProblems(response.headers);
  const leakage = getSensitivePayloadFindings(payload);
  const bodyProblems = payload && typeof payload === "object" ? [] : ["readiness did not return JSON"];
  const ready = response.status === 200 && payload?.ok === true;
  const allowedStatus = response.status === 200 || response.status === 503;
  const ok = allowedStatus && headerProblems.length === 0 && leakage.length === 0 && bodyProblems.length === 0 && (!requireReady || ready);
  const severity = !allowedStatus || headerProblems.length > 0 || leakage.length > 0 || bodyProblems.length > 0 || requireReady ? "medium" : "warning";
  addResult("GET /api/readiness", ok, severity, [
    `status=${response.status}`,
    `ready=${Boolean(payload?.ok)}`,
    ...headerProblems,
    ...bodyProblems,
    ...leakage,
    !ready && !requireReady ? "staging is not reporting ready" : "",
  ].filter(Boolean).join("; "));
}

async function checkAuthGate(route) {
  const requestId = requestIdFor(route, "auth");
  const response = await request(route.path, {
    method: route.method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "IroGuide-prelaunch-DAST/1.0",
      "x-request-id": requestId,
    },
    body: route.body,
  });

  if (!response.ok) {
    addResult(`${route.method} ${route.path} requires auth`, false, "high", response.detail);
    return;
  }

  const payload = await readJson(response);
  const headerProblems = getApiHeaderProblems(response.headers, requestId);
  const leakage = getSensitivePayloadFindings(payload);
  addResult(`${route.method} ${route.path} requires auth`, response.status === 401 && headerProblems.length === 0 && leakage.length === 0, "high", [
    `status=${response.status}`,
    ...headerProblems,
    ...leakage,
  ].filter(Boolean).join("; "));
}

async function checkCrossSiteBlock(route) {
  const requestId = requestIdFor(route, "cross-site");
  const response = await request(route.path, {
    method: route.method,
    headers: {
      "Content-Type": "application/json",
      "Origin": externalOrigin,
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "IroGuide-prelaunch-DAST/1.0",
      "x-request-id": requestId,
    },
    body: route.body,
  });

  if (!response.ok) {
    addResult(`${route.method} ${route.path} blocks cross-site`, false, "high", response.detail);
    return;
  }

  const headerProblems = getApiHeaderProblems(response.headers, requestId);
  addResult(`${route.method} ${route.path} blocks cross-site`, response.status === 403 && headerProblems.length === 0, "high", [
    `status=${response.status}`,
    ...headerProblems,
  ].filter(Boolean).join("; "));
}

async function checkContentTypeGate(route) {
  const requestId = requestIdFor(route, "content-type");
  const response = await request(route.path, {
    method: route.method,
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": "IroGuide-prelaunch-DAST/1.0",
      "x-request-id": requestId,
    },
    body: "prelaunch-dast",
  });

  if (!response.ok) {
    addResult(`${route.method} ${route.path} rejects unsupported media`, false, "medium", response.detail);
    return;
  }

  const headerProblems = getApiHeaderProblems(response.headers, requestId);
  addResult(`${route.method} ${route.path} rejects unsupported media`, response.status === 415 && headerProblems.length === 0, "medium", [
    `status=${response.status}`,
    ...headerProblems,
  ].filter(Boolean).join("; "));
}

async function request(path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(path, baseUrl);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { ok: true, status: response.status, headers: response.headers, response };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      headers: new Headers(),
      detail: error instanceof Error ? error.message : "request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(response) {
  try {
    return await response.response.json();
  } catch {
    return null;
  }
}

function getPageHeaderProblems(headers) {
  const problems = [];
  const csp = headers.get("content-security-policy") ?? "";
  if (!csp.includes("default-src 'self'")) problems.push("missing strict CSP default-src");
  if (!csp.includes("object-src 'none'")) problems.push("missing CSP object-src block");
  if (!csp.includes("frame-ancestors 'none'")) problems.push("missing CSP frame-ancestors block");
  if (new URL(baseUrl).protocol === "https:" && !headers.get("strict-transport-security")) {
    problems.push("missing HSTS");
  }
  if ((headers.get("x-frame-options") ?? "").toLowerCase() !== "deny") problems.push("missing X-Frame-Options DENY");
  if ((headers.get("x-content-type-options") ?? "").toLowerCase() !== "nosniff") problems.push("missing X-Content-Type-Options nosniff");
  if (!headers.get("referrer-policy")) problems.push("missing Referrer-Policy");
  if (!headers.get("permissions-policy")) problems.push("missing Permissions-Policy");
  if (!headers.get("cross-origin-opener-policy")) problems.push("missing Cross-Origin-Opener-Policy");
  if (!headers.get("cross-origin-resource-policy")) problems.push("missing Cross-Origin-Resource-Policy");
  if (headers.has("x-powered-by")) problems.push("leaks X-Powered-By");
  return problems;
}

function getApiHeaderProblems(headers, expectedRequestId = null) {
  const problems = [];
  const cacheControl = headers.get("cache-control") ?? "";
  const contentType = headers.get("content-type") ?? "";
  const vary = headers.get("vary") ?? "";
  if (!cacheControl.toLowerCase().includes("no-store")) problems.push("missing API no-store cache control");
  if (!contentType.toLowerCase().includes("application/json")) problems.push("missing API JSON content type");
  if ((headers.get("x-robots-tag") ?? "").toLowerCase() !== "noindex") problems.push("missing API noindex robots header");
  if (!headers.get("x-request-id")) problems.push("missing API request id");
  if (expectedRequestId && headers.get("x-request-id") !== expectedRequestId) problems.push("API request id was not preserved");
  if (!vary.toLowerCase().includes("authorization")) problems.push("missing Authorization vary header");
  if ((headers.get("access-control-allow-origin") ?? "") === "*") problems.push("wildcard CORS on API response");
  if (headers.has("x-powered-by")) problems.push("leaks X-Powered-By");
  return problems;
}

function getSensitivePayloadFindings(payload) {
  const findings = [];
  walkPayload(payload, [], (path, value) => {
    const key = path.at(-1) ?? "";
    if (/^(apiKey|privateKey|clientEmail|projectId|accessToken|refreshToken|idToken|authorization)$/i.test(key)) {
      findings.push(`sensitive key exposed: ${path.join(".")}`);
    }
    if (typeof value === "string" && /(-----BEGIN .*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[0-9A-Za-z._-]+)/.test(value)) {
      findings.push(`secret-shaped value exposed: ${path.join(".")}`);
    }
    if (typeof value === "string" && /(Error:|at\s+\w+\s+\(|webpack-internal:|node_modules)/.test(value)) {
      findings.push(`stack-like value exposed: ${path.join(".")}`);
    }
  });
  return findings;
}

function walkPayload(value, path, visitor) {
  visitor(path, value);
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkPayload(item, [...path, String(index)], visitor));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    walkPayload(child, [...path, key], visitor);
  }
}

async function writeReport(report) {
  const fullPath = resolve(reportPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function addResult(name, ok, severity, detail = "") {
  results.push({ name, ok, severity, detail });
}

function requestIdFor(route, kind) {
  return `dast-${kind}-${route.method.toLowerCase()}-${route.path.replace(/[^a-z0-9]+/gi, "-")}`;
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

await main();
