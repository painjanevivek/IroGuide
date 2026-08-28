import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { accessDecisionCommandSchema, accessOperationsFilterSchema } from "@/domain/access-operations";
import { applyReviewAccessDecision, listReviewAccessCandidates } from "@/server/access-operations";
import { isIroGuideAdmin } from "@/server/admin-authorization";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { ActivationConflictError, ActivationNotFoundError } from "@/server/product-activation-storage";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorized = await authorizeOperator(request, false);
  if ("response" in authorized) return authorized.response;
  try {
    const url = new URL(request.url);
    const filter = accessOperationsFilterSchema.parse(Object.fromEntries(["cohort", "category", "age", "status"].flatMap((key) => url.searchParams.get(key) ? [[key, url.searchParams.get(key)]] : [])));
    return NextResponse.json(await listReviewAccessCandidates(filter), { headers: jsonHeaders(authorized.context) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Access filters are invalid." }, { status: 400, headers: jsonHeaders(authorized.context) });
    }
    return NextResponse.json({ error: "Access candidates could not be loaded." }, { status: 503, headers: jsonHeaders(authorized.context) });
  }
}

export async function POST(request: Request) {
  const authorized = await authorizeOperator(request, true);
  if ("response" in authorized) return authorized.response;
  try {
    const command = accessDecisionCommandSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.activationJson));
    const record = await applyReviewAccessDecision(authorized.userId, command);
    logRequestEvent("info", "access_operations.decision_recorded", authorized.context, { decision: command.decision, reasonCode: command.reasonCode, user: authorized.userLogId });
    return NextResponse.json({ record }, { headers: jsonHeaders(authorized.context) });
  } catch (error) {
    const bodyError = getRequestBodyError(error);
    if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(authorized.context) });
    if (error instanceof ActivationConflictError) return NextResponse.json({ error: error.message, currentRevision: error.currentRevision }, { status: 409, headers: jsonHeaders(authorized.context) });
    if (error instanceof ActivationNotFoundError) return NextResponse.json({ error: error.message }, { status: 404, headers: jsonHeaders(authorized.context) });
    return NextResponse.json({ error: "Access decision could not be saved." }, { status: 400, headers: jsonHeaders(authorized.context) });
  }
}

async function authorizeOperator(request: Request, mutation: boolean) {
  const context = createRequestContext(request, "api.admin.access_interest");
  const origin = enforceSameOriginRequest(request, context, "access_operations");
  if ("response" in origin) return origin;
  if (mutation) {
    const contentType = requireContentType(request, context, "access_operations");
    if ("response" in contentType) return contentType;
  }
  const auth = await requireVerifiedFirebaseUser(request, context, "access_operations", { missing: "Sign in with an operator account." });
  if ("response" in auth) return auth;
  if (!isIroGuideAdmin(auth.user)) return { response: NextResponse.json({ error: "This account cannot operate review access." }, { status: 403, headers: jsonHeaders(context) }) };
  const rate = await enforceRateLimit({ context, eventPrefix: "access_operations", key: `access-operations:${auth.userLogId}`, limit: mutation ? 30 : 60, message: "Too many access operations.", request, windowMs: 10 * 60 * 1_000 });
  if ("response" in rate) return rate;
  return { context, userId: auth.user.uid, userLogId: auth.userLogId };
}
