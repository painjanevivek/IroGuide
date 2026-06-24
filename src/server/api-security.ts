import { NextResponse } from "next/server";
import { FirebaseAdminUnavailableError, FirebaseTokenVerificationError, verifyFirebaseIdToken } from "@/server/firebase-admin";
import { createRequestContext, getClientKey, jsonHeaders, logRequestEvent, toLogSafeUserId, type RequestContext } from "@/server/observability";
import { checkRateLimit, getRateLimitHeaders, type RateLimitResult } from "@/server/rate-limit";

type VerifiedFirebaseUser = Awaited<ReturnType<typeof verifyFirebaseIdToken>>;

type AuthMessages = {
  missing: string;
  unavailable?: string;
};

type AuthResult = {
  user: VerifiedFirebaseUser;
  userLogId: string;
} | {
  response: NextResponse;
};

type RateLimitOptions = {
  context: RequestContext;
  eventPrefix: string;
  key: string;
  limit: number;
  message: string;
  request: Request;
  windowMs: number;
};

type RateLimitCheck = {
  result: RateLimitResult;
} | {
  response: NextResponse;
};

type SecurityGateResult = {
  allowed: true;
} | {
  response: NextResponse;
};

const JSON_CONTENT_TYPES = new Set(["application/json"]);

export function enforceSameOriginRequest(
  request: Request,
  context: RequestContext,
  eventPrefix: string,
): SecurityGateResult {
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "cross-site" || secFetchSite === "none") {
    logRequestEvent("warn", `${eventPrefix}.cross_site_blocked`, context, { secFetchSite });
    return forbiddenOriginResponse(context);
  }

  const origin = request.headers.get("origin");
  if (!origin) return { allowed: true };

  const allowedOrigins = getAllowedOrigins(request);
  const normalizedOrigin = normalizeOrigin(origin);
  if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) return { allowed: true };

  logRequestEvent("warn", `${eventPrefix}.origin_blocked`, context, { origin: normalizedOrigin ?? "invalid" });
  return forbiddenOriginResponse(context);
}

export function requireContentType(
  request: Request,
  context: RequestContext,
  eventPrefix: string,
  allowedContentTypes: Iterable<string> = JSON_CONTENT_TYPES,
): SecurityGateResult {
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const allowed = new Set(Array.from(allowedContentTypes, (value) => value.toLowerCase()));
  if (contentType && allowed.has(contentType)) return { allowed: true };

  logRequestEvent("warn", `${eventPrefix}.unsupported_media_type`, context, { contentType: contentType ?? "missing" });
  return {
    response: NextResponse.json(
      { error: "Request content type is not supported." },
      { status: 415, headers: jsonHeaders(context) },
    ),
  };
}

export async function requireVerifiedFirebaseUser(
  request: Request,
  context: RequestContext,
  eventPrefix: string,
  messages: AuthMessages,
): Promise<AuthResult> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    logRequestEvent("warn", `${eventPrefix}.auth_missing`, context);
    return {
      response: NextResponse.json(
        { error: messages.missing },
        { status: 401, headers: jsonHeaders(context) },
      ),
    };
  }

  try {
    const user = await verifyFirebaseIdToken(authorization.slice("Bearer ".length).trim());
    return { user, userLogId: toLogSafeUserId(user.uid) };
  } catch (error) {
    if (error instanceof FirebaseAdminUnavailableError) {
      logRequestEvent("error", `${eventPrefix}.admin_unavailable`, context);
      return {
        response: NextResponse.json(
          { error: messages.unavailable ?? error.message },
          { status: 503, headers: jsonHeaders(context) },
        ),
      };
    }

    if (error instanceof FirebaseTokenVerificationError) {
      logRequestEvent("warn", `${eventPrefix}.auth_invalid`, context);
      return {
        response: NextResponse.json(
          { error: messages.missing },
          { status: 401, headers: jsonHeaders(context, getAuthDiagnosticHeaders(error)) },
        ),
      };
    }

    throw error;
  }
}

export function enforceRateLimit({
  context,
  eventPrefix,
  key,
  limit,
  message,
  request,
  windowMs,
}: RateLimitOptions): RateLimitCheck {
  const result = checkRateLimit({
    key: `${key}:${getClientKey(request, "unknown")}`,
    limit,
    windowMs,
  });

  if (result.allowed) return { result };

  logRequestEvent("warn", `${eventPrefix}.rate_limited`, context);
  return {
    response: NextResponse.json(
      { error: message },
      { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(result)) },
    ),
  };
}

export function createPublicRequestContext(request: Request, route: string) {
  return createRequestContext(request, route);
}

function forbiddenOriginResponse(context: RequestContext) {
  return {
    response: NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403, headers: jsonHeaders(context) },
    ),
  };
}

function getAllowedOrigins(request: Request) {
  return new Set([
    normalizeOrigin(request.url),
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    normalizeOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
    getForwardedOrigin(request),
  ].filter((origin): origin is string => Boolean(origin)));
}

function getForwardedOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return normalizeOrigin(`${proto}://${host}`);
}

function normalizeOrigin(value: string | undefined | null) {
  if (!value) return null;
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function getAuthDiagnosticHeaders(error: FirebaseTokenVerificationError): HeadersInit {
  return error.code ? { "x-iroguide-auth-error": error.code } : {};
}
