import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, string | number | boolean | null | undefined>;

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
    ...fields,
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
    "x-request-id": context.requestId,
    ...extra,
  };
}
