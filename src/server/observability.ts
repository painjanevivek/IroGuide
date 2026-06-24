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
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
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
  return {
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Vary": "Authorization",
    "X-Robots-Tag": "noindex",
    "x-request-id": context.requestId,
    ...extra,
  };
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
