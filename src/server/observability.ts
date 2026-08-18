import { createHash, randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, string | number | boolean | null | undefined>;
const SENSITIVE_LOG_KEY = /(authorization|token|secret|password|private|credential|cookie|api[-_]?key|image|base64|prompt|brief|response)/i;

export type RequestContext = {
  requestId: string;
  route: string;
  startedAt: number;
};

export function createRequestContext(request: Request, route: string): RequestContext {
  return {
    requestId: request.headers.get("x-request-id") ?? randomUUID(),
    route,
    startedAt: Date.now(),
  };
}

export function getClientKey(request: Request, fallback: string) {
  const vercelClientIp = getHeaderIp(request, "x-vercel-forwarded-for");
  if (process.env.VERCEL === "1" && vercelClientIp) return vercelClientIp;

  // Production deployments outside Vercel must add a platform-specific trusted
  // adapter before using client IPs for a security decision. Accepting ordinary
  // forwarding headers here would let a caller choose their own rate-limit key.
  if (process.env.NODE_ENV === "production") return fallback;

  return getHeaderIp(request, "x-forwarded-for")
    ?? getHeaderIp(request, "x-real-ip")
    ?? fallback;
}

export function logRequestEvent(level: LogLevel, event: string, context: RequestContext, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    route: context.route,
    requestId: context.requestId,
    durationMs: Date.now() - context.startedAt,
    ...sanitizeLogFields(fields),
  };

  const serialized = JSON.stringify(payload);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

export function jsonHeaders(context: RequestContext, extra: HeadersInit = {}) {
  const headers = new Headers(extra);
  headers.delete("Access-Control-Allow-Credentials");
  headers.delete("Access-Control-Allow-Headers");
  headers.delete("Access-Control-Allow-Methods");
  headers.delete("Access-Control-Allow-Origin");
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Expires", "0");
  headers.set("Pragma", "no-cache");
  headers.set("Vary", mergeVary(headers.get("Vary"), "Authorization", "Origin"));
  headers.set("X-Robots-Tag", "noindex");
  headers.set("x-request-id", context.requestId);
  return headers;
}

export function toLogSafeUserId(userId: string) {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

function sanitizeLogFields(fields: LogFields): LogFields {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => {
    if (SENSITIVE_LOG_KEY.test(key)) return [key, "[redacted]"];
    if (typeof value === "string" && value.length > 500) return [key, `${value.slice(0, 500)}...`];
    return [key, value];
  }));
}

function mergeVary(current: string | null, ...values: string[]) {
  return Array.from(new Set([
    ...(current?.split(",").map((value) => value.trim()).filter(Boolean) ?? []),
    ...values,
  ])).join(", ");
}

function getHeaderIp(request: Request, name: string) {
  const value = request.headers.get(name)?.split(",")[0]?.trim();
  if (!value || value.length > 64) return null;

  // IPv4 and IPv6 literals only. This rejects header junk before it can become
  // a Redis key or a rate-limit partition.
  return /^[0-9a-f:.]+$/i.test(value) ? value : null;
}
