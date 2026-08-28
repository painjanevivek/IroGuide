import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AccountDeletionInProgressError } from "@/server/account-deletion-lock";
import { communityMutationSchema, type CommunityMutation } from "@/domain/community";
import { createPublicRequestContext, enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { CommunityMutationError, getCommunityAccountRiskState, listCommunityComments, listCommunityProjections, mutateCommunity } from "@/server/community-storage";
import { getCommunitySafetyStatus } from "@/server/community-safety-config";
import { jsonHeaders, logRequestEvent } from "@/server/observability";
import { getServerLaunchCapabilities } from "@/server/launch-capabilities";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";
import { checkRateLimit, getRateLimitHeaders } from "@/server/rate-limit";

const COMMUNITY_MUTATION_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };
const COMMUNITY_READ_RATE_LIMIT = { limit: 120, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = createPublicRequestContext(request, "api.community.list");
  if (!isCommunityServingEnabled()) return communityClosedResponse(context, "community_read");
  const originCheck = enforceSameOriginRequest(request, context, "community_read");
  if ("response" in originCheck) return originCheck.response;
  const auth = await requireVerifiedFirebaseUser(request, context, "community_read", { missing: "Sign in again before opening Community." });
  if ("response" in auth) return auth.response;
  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "community_read",
    key: `community-read:${auth.user.uid}`,
    message: "Too many Community refreshes. Please try again shortly.",
    request,
    ...COMMUNITY_READ_RATE_LIMIT,
  });
  if ("response" in rateLimit) return rateLimit.response;
  try {
    const postId = new URL(request.url).searchParams.get("postId");
    if (postId && (!/^[A-Za-z0-9_.-]+$/.test(postId) || postId.length > 320)) {
      return NextResponse.json({ error: "Community post identifier is invalid." }, { status: 400, headers: jsonHeaders(context) });
    }
    const result = postId
      ? { comments: await listCommunityComments(postId, auth.user.uid) }
      : { projections: await listCommunityProjections(auth.user.uid) };
    return NextResponse.json(result, { headers: jsonHeaders(context) });
  } catch {
    logRequestEvent("error", "community_read.failed", context, { user: auth.userLogId });
    return NextResponse.json({ error: "Community could not be loaded." }, { status: 500, headers: jsonHeaders(context) });
  }
}

export async function POST(request: Request) {
  const context = createPublicRequestContext(request, "api.community.mutate");
  if (!isCommunityServingEnabled()) return communityClosedResponse(context, "community_mutation");
  const originCheck = enforceSameOriginRequest(request, context, "community_mutation");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "community_mutation");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;

  const auth = await requireVerifiedFirebaseUser(request, context, "community_mutation", {
    missing: "Sign in again before updating Community.",
  });
  if ("response" in auth) return auth.response;

  try {
    const mutation = communityMutationSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.communityJson));
    const riskState = await getCommunityAccountRiskState(auth.user.uid);
    if (riskState === "banned") throw new CommunityMutationError("This account cannot update Community.", 403);
    const actionLimit = getActionRateLimit(mutation);
    const accountRateLimit = await checkRateLimit({
      key: `community-account:${auth.user.uid}`,
      limit: riskState === "restricted" ? 20 : 120,
      windowMs: COMMUNITY_MUTATION_RATE_LIMIT.windowMs,
    });
    if (!accountRateLimit.allowed) {
      logRequestEvent("warn", "community_mutation.account_rate_limited", context, { user: auth.userLogId });
      return NextResponse.json(
        { error: "Too many community updates. Please try again shortly." },
        { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(accountRateLimit)) },
      );
    }
    const accountActionRateLimit = await checkRateLimit({
      key: `community-account-action:${auth.user.uid}:${mutation.action}`,
      limit: riskState === "restricted" ? 10 : actionLimit,
      windowMs: COMMUNITY_MUTATION_RATE_LIMIT.windowMs,
    });
    if (!accountActionRateLimit.allowed) {
      logRequestEvent("warn", "community_mutation.account_action_rate_limited", context, { user: auth.userLogId });
      return NextResponse.json(
        { error: "Too many community updates. Please try again shortly." },
        { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(accountActionRateLimit)) },
      );
    }
    const rateLimit = await enforceRateLimit({
      context,
      eventPrefix: "community_mutation",
      key: `community:${auth.user.uid}:${mutation.action}`,
      limit: riskState === "restricted" ? 10 : actionLimit,
      message: "Too many community updates. Please try again shortly.",
      request,
      windowMs: COMMUNITY_MUTATION_RATE_LIMIT.windowMs,
    });
    if ("response" in rateLimit) return rateLimit.response;
    const targetLimit = getTargetRateLimit(mutation);
    if (targetLimit) {
      const globalTargetRateLimit = await checkRateLimit({
        key: `community-target:${mutation.action}:${targetLimit.target}`,
        limit: targetLimit.limit,
        windowMs: targetLimit.windowMs,
      });
      if (!globalTargetRateLimit.allowed) {
        logRequestEvent("warn", "community_target_mutation.rate_limited", context, { user: auth.userLogId });
        return NextResponse.json(
          { error: "This Community item has received too many updates. Please try again later." },
          { status: 429, headers: jsonHeaders(context, getRateLimitHeaders(globalTargetRateLimit)) },
        );
      }
      const targetRateLimit = await enforceRateLimit({
        context,
        eventPrefix: "community_target_mutation",
        key: `community-target:${mutation.action}:${targetLimit.target}`,
        limit: targetLimit.limit,
        message: "This Community item has received too many updates. Please try again later.",
        request,
        windowMs: targetLimit.windowMs,
      });
      if ("response" in targetRateLimit) return targetRateLimit.response;
    }
    const result = await mutateCommunity(auth.user, mutation);
    logRequestEvent("info", "community_mutation.completed", context, { user: auth.userLogId });
    return NextResponse.json(result, { headers: jsonHeaders(context) });
  } catch (error) {
    const bodyError = getRequestBodyError(error);
    if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Community details are incomplete or invalid." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof CommunityMutationError) {
      if (error.status === 409) {
        logRequestEvent("warn", "community_mutation.provenance_rejected", context, { user: auth.userLogId });
      }
      return NextResponse.json({ error: error.message }, { status: error.status, headers: jsonHeaders(context) });
    }
    if (error instanceof AccountDeletionInProgressError) {
      logRequestEvent("warn", "community_mutation.account_deleting", context, { user: auth.userLogId });
      return NextResponse.json({ error: error.message }, { status: error.status, headers: jsonHeaders(context) });
    }

    logRequestEvent("error", "community_mutation.failed", context, { user: auth.userLogId });
    return NextResponse.json({ error: "Community update failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}

function isCommunityServingEnabled() {
  const safety = getCommunitySafetyStatus();
  return getServerLaunchCapabilities().community && safety.mode === "staff" && safety.ready;
}

function communityClosedResponse(context: ReturnType<typeof createPublicRequestContext>, eventPrefix: string) {
  logRequestEvent("warn", `${eventPrefix}.capability_blocked`, context);
  return NextResponse.json(
    { error: "Community is not available in the current launch profile." },
    { status: 404, headers: jsonHeaders(context) },
  );
}

function getActionRateLimit(mutation: CommunityMutation) {
  if (mutation.action === "report") return 10;
  if (mutation.action === "publish") return 8;
  if (mutation.action === "comment") return 30;
  return COMMUNITY_MUTATION_RATE_LIMIT.limit;
}

function getTargetRateLimit(mutation: CommunityMutation) {
  if (mutation.action === "report") return { limit: 500, target: `${mutation.targetType}:${mutation.targetId}`, windowMs: 60 * 60 * 1000 };
  if ("postId" in mutation && (mutation.action === "comment" || mutation.action === "interaction")) {
    return { limit: mutation.action === "comment" ? 60 : 240, target: mutation.postId, windowMs: 10 * 60 * 1000 };
  }
  return null;
}
