import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createPublicRequestContext, enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { CommunityMutationError, mutateCommunity } from "@/server/community-storage";
import { jsonHeaders, logRequestEvent } from "@/server/observability";

const COMMUNITY_MUTATION_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createPublicRequestContext(request, "api.community.mutate");
  const originCheck = enforceSameOriginRequest(request, context, "community_mutation");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "community_mutation");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;

  const auth = await requireVerifiedFirebaseUser(request, context, "community_mutation", {
    missing: "Sign in again before updating Community.",
  });
  if ("response" in auth) return auth.response;

  const rateLimit = enforceRateLimit({
    context,
    eventPrefix: "community_mutation",
    key: `community:${auth.user.uid}`,
    message: "Too many community updates. Please try again shortly.",
    request,
    ...COMMUNITY_MUTATION_RATE_LIMIT,
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const result = await mutateCommunity(auth.user, await request.json());
    logRequestEvent("info", "community_mutation.completed", context, { user: auth.userLogId });
    return NextResponse.json(result, { headers: jsonHeaders(context) });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Community details are incomplete or invalid." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof CommunityMutationError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: jsonHeaders(context) });
    }

    logRequestEvent("error", "community_mutation.failed", context, { user: auth.userLogId });
    return NextResponse.json({ error: "Community update failed. Please try again." }, { status: 500, headers: jsonHeaders(context) });
  }
}
