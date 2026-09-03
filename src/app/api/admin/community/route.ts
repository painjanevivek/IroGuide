import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { applyCommunityModerationCommand, communityModerationCommandSchema, exportCommunityModerationAudit, listCommunityModerationQueue } from "@/server/community-moderation-storage";
import { dispatchNextCommunityEvent, getCommunityOperationsDiagnostics } from "@/server/community-operations";
import { getCommunitySafetyStatus, isCommunityModerator, isCommunitySeniorModerator } from "@/server/community-safety-config";
import { reconcileCommunityCounters } from "@/server/community-counter-storage";
import { CommunityMutationError } from "@/server/community-storage";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

const operationsCommandSchema = z.discriminatedUnion("command", [
  z.strictObject({ command: z.literal("dispatch") }),
  z.strictObject({ command: z.literal("reconcile-counters"), postId: z.string().regex(/^[A-Za-z0-9_.-]+$/).max(320).optional() }),
]);
const adminCommandSchema = z.union([communityModerationCommandSchema, operationsCommandSchema]);
const ADMIN_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request, "api.admin.community.read");
  const access = await authorize(request, context, "admin_community_read");
  if ("response" in access) return access.response;
  try {
    const view = new URL(request.url).searchParams.get("view") ?? "queue";
    const result = view === "audit"
      ? await exportCommunityModerationAudit(access.user.uid)
      : view === "diagnostics"
        ? await getCommunityOperationsDiagnostics()
        : await listCommunityModerationQueue(access.user.uid);
    return NextResponse.json(result, { headers: jsonHeaders(context) });
  } catch (error) {
    return handleError(error, context, "admin_community_read");
  }
}

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.admin.community.mutate");
  const access = await authorize(request, context, "admin_community_mutation", true);
  if ("response" in access) return access.response;
  try {
    const command = adminCommandSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.communityJson));
    if (command.command === "dispatch" || command.command === "reconcile-counters") {
      if (!isCommunitySeniorModerator(access.user.uid)) throw new CommunityMutationError("A senior moderator must run Community recovery operations.", 403);
      const result = command.command === "dispatch"
        ? await dispatchNextCommunityEvent(`moderator:${access.user.uid}`)
        : await reconcileCommunityCounters({ postId: command.postId });
      return NextResponse.json(result, { headers: jsonHeaders(context) });
    }
    return NextResponse.json(await applyCommunityModerationCommand(access.user.uid, command), { headers: jsonHeaders(context) });
  } catch (error) {
    return handleError(error, context, "admin_community_mutation");
  }
}

async function authorize(request: Request, context: ReturnType<typeof createRequestContext>, eventPrefix: string, requireJson = false) {
  const safety = getCommunitySafetyStatus();
  if (safety.mode !== "staff" || !safety.ready) {
    logRequestEvent("warn", `${eventPrefix}.closed`, context);
    return { response: NextResponse.json({ error: "Community moderation is closed." }, { status: 404, headers: jsonHeaders(context) }) } as const;
  }
  const origin = enforceSameOriginRequest(request, context, eventPrefix);
  if ("response" in origin) return origin;
  if (requireJson) {
    const contentType = requireContentType(request, context, eventPrefix);
    if ("response" in contentType) return contentType;
  }
  const auth = await requireVerifiedFirebaseUser(request, context, eventPrefix, { missing: "Sign in with a moderator account." });
  if ("response" in auth) return auth;
  if (!isCommunityModerator(auth.user.uid)) {
    logRequestEvent("warn", `${eventPrefix}.forbidden`, context, { user: auth.userLogId });
    return { response: NextResponse.json({ error: "This account cannot access Community moderation." }, { status: 403, headers: jsonHeaders(context) }) } as const;
  }
  const rate = await enforceRateLimit({
    context,
    eventPrefix,
    key: `${eventPrefix}:${auth.user.uid}`,
    message: "Too many Community moderation requests.",
    request,
    ...ADMIN_RATE_LIMIT,
  });
  if ("response" in rate) return rate;
  return { user: auth.user } as const;
}

function handleError(error: unknown, context: ReturnType<typeof createRequestContext>, eventPrefix: string) {
  const bodyError = getRequestBodyError(error);
  if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
  if (error instanceof ZodError) return NextResponse.json({ error: "Moderation details are incomplete or invalid." }, { status: 400, headers: jsonHeaders(context) });
  if (error instanceof CommunityMutationError) return NextResponse.json({ error: error.message }, { status: error.status, headers: jsonHeaders(context) });
  logRequestEvent("error", `${eventPrefix}.failed`, context);
  return NextResponse.json({ error: "Community moderation failed safely." }, { status: 500, headers: jsonHeaders(context) });
}
