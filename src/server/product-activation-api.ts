import "server-only";

import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AccountDeletionInProgressError } from "./account-deletion-lock";
import {
  createPublicRequestContext,
  enforceRateLimit,
  enforceSameOriginRequest,
  requireContentType,
  requireVerifiedFirebaseUser,
} from "./api-security";
import { FirebaseAdminUnavailableError } from "./firebase-admin";
import { getServerLaunchCapabilities } from "./launch-capabilities";
import { jsonHeaders, logRequestEvent, type RequestContext } from "./observability";
import {
  ActivationConflictError,
  ActivationDeletionIncompleteError,
  ActivationNotFoundError,
} from "./product-activation-storage";
import { checkRateLimit, getRateLimitHeaders, type RateLimitResult } from "./rate-limit";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "./request-body";

const ACCOUNT_RATE_LIMIT = { limit: 180, windowMs: 10 * 60 * 1000 } as const;
const MUTATION_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 } as const;

type ActivationRequest = {
  context: RequestContext;
  rateLimit: RateLimitResult;
  userId: string;
  userLogId: string;
};

export async function authorizeActivationRequest(
  request: Request,
  operation: string,
  mutation = false,
): Promise<ActivationRequest | { response: NextResponse }> {
  const context = createPublicRequestContext(request, `api.activation.${operation}`);
  if (!getServerLaunchCapabilities().guidedLearning) {
    return {
      response: NextResponse.json(
        { error: "Guided learning is not available in the current launch profile." },
        { status: 404, headers: jsonHeaders(context) },
      ),
    } as const;
  }

  try {
    const origin = enforceSameOriginRequest(request, context, operation);
    if ("response" in origin) return origin;
    if (mutation) {
      const contentType = requireContentType(request, context, operation);
      if ("response" in contentType) return contentType;
    }

    const auth = await requireVerifiedFirebaseUser(request, context, operation, {
      missing: "Sign in again to continue your learning progress.",
    });
    if ("response" in auth) return auth;

    const accountLimit = await checkRateLimit({
      key: `activation-account:${auth.user.uid}`,
      ...(mutation ? MUTATION_RATE_LIMIT : ACCOUNT_RATE_LIMIT),
    });
    if (!accountLimit.allowed) {
      logRequestEvent("warn", `${operation}.account_rate_limited`, context, { user: auth.userLogId });
      return {
        response: NextResponse.json(
          { error: "Too many learning requests. Please try again shortly." },
          { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(accountLimit)) },
        ),
      } as const;
    }

    const clientLimit = await enforceRateLimit({
      context,
      eventPrefix: operation,
      key: `activation-client:${operation}:${auth.user.uid}`,
      message: "Too many learning requests. Please try again shortly.",
      request,
      ...(mutation ? MUTATION_RATE_LIMIT : ACCOUNT_RATE_LIMIT),
    });
    if ("response" in clientLimit) return clientLimit;

    return {
      context,
      rateLimit: clientLimit.result,
      userId: auth.user.uid,
      userLogId: auth.userLogId,
    } satisfies ActivationRequest;
  } catch {
    logRequestEvent("error", `${operation}.security_adapter_unavailable`, context);
    return {
      response: NextResponse.json(
        { error: "Learning progress security checks are temporarily unavailable." },
        { status: 503, headers: jsonHeaders(context) },
      ),
    };
  }
}

export async function parseActivationBody<T>(request: Request, schema: ZodType<T>) {
  const body = await readJsonBody(request, REQUEST_BODY_LIMITS.activationJson);
  return schema.parse(body);
}

export function activationJson(request: ActivationRequest, body: unknown, status = 200) {
  logRequestEvent("info", "activation.request.completed", request.context, {
    status,
    user: request.userLogId,
  });
  return NextResponse.json(body, {
    status,
    headers: jsonHeaders(request.context, getRateLimitHeaders(request.rateLimit)),
  });
}

export function activationError(error: unknown, request: { context: RequestContext; userLogId?: string }, operation: string) {
  const bodyError = getRequestBodyError(error);
  if (bodyError) return errorJson(request.context, bodyError.message, bodyError.status);
  if (error instanceof ZodError) return errorJson(request.context, "Request fields are invalid.", 400, { issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) });
  if (error instanceof ActivationNotFoundError) return errorJson(request.context, error.message, error.status);
  if (error instanceof ActivationConflictError) return errorJson(request.context, error.message, error.status, { currentRevision: error.currentRevision });
  if (error instanceof AccountDeletionInProgressError) return errorJson(request.context, "Account changes are locked while deletion is in progress.", 423);
  if (error instanceof ActivationDeletionIncompleteError) return errorJson(request.context, error.message, error.status, { retryRequired: true, result: error.result });
  if (error instanceof FirebaseAdminUnavailableError) return errorJson(request.context, error.message, 503);

  logRequestEvent("error", `${operation}.failed`, request.context, { user: request.userLogId });
  return errorJson(request.context, "Learning progress is temporarily unavailable. Please try again.", 503);
}

function errorJson(context: RequestContext, message: string, status: number, details: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...details }, { status, headers: jsonHeaders(context) });
}
