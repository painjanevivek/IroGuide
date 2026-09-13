import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { productEvidenceEventSchema } from "@/domain/product-evidence";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { enforceCapabilityBeforeEffects } from "@/server/capability-policy";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { recordProductEvidenceEvent } from "@/server/product-evidence";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

const PRODUCT_EVIDENCE_RATE_LIMIT = { limit: 120, windowMs: 10 * 60 * 1_000 };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.product_evidence.create");
  const capability = enforceCapabilityBeforeEffects({
    capability: "productEvidence",
    context,
    eventPrefix: "product_evidence",
    message: "Product evidence collection is disabled.",
  });
  if (!capability.allowed) return capability.response;
  const originCheck = enforceSameOriginRequest(request, context, "product_evidence");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "product_evidence");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;
  if (request.headers.get("x-iroguide-analytics-consent") !== "v1") {
    logRequestEvent("warn", "product_evidence.consent_missing", context);
    return NextResponse.json(
      { error: "Analytics consent is required before recording product evidence." },
      { status: 403, headers: jsonHeaders(context) },
    );
  }

  const auth = await requireVerifiedFirebaseUser(request, context, "product_evidence", {
    missing: "Sign in with a verified account before recording product evidence.",
    unavailable: "Product evidence is not available right now.",
  });
  if ("response" in auth) return auth.response;

  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: "product_evidence",
    key: `product-evidence:${auth.userLogId}`,
    limit: PRODUCT_EVIDENCE_RATE_LIMIT.limit,
    message: "Too many product evidence events. Please try again shortly.",
    request,
    windowMs: PRODUCT_EVIDENCE_RATE_LIMIT.windowMs,
  });
  if ("response" in rateLimit) return rateLimit.response;

  try {
    const event = productEvidenceEventSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.productEvidenceJson));
    const result = await recordProductEvidenceEvent({ event, userId: auth.user.uid });
    logRequestEvent("info", "product_evidence.accepted", context, {
      eventName: event.name,
      result,
      user: auth.userLogId,
    });
    return NextResponse.json({ accepted: true }, { status: 202, headers: jsonHeaders(context) });
  } catch (error) {
    const bodyError = getRequestBodyError(error);
    if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
    }
    if (error instanceof ZodError) {
      logRequestEvent("warn", "product_evidence.rejected", context, { user: auth.userLogId });
      return NextResponse.json({ error: "Product evidence fields are not allowed." }, { status: 400, headers: jsonHeaders(context) });
    }
    logRequestEvent("error", "product_evidence.failed", context, { user: auth.userLogId });
    return NextResponse.json({ error: "Product evidence could not be recorded." }, { status: 503, headers: jsonHeaders(context) });
  }
}
