import { NextResponse } from "next/server";
import { createPublicRequestContext, enforceSameOriginRequest, requireContentType } from "@/server/api-security";
import { jsonHeaders, logRequestEvent } from "@/server/observability";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

const operations = ["critique", "improvement", "comparison", "follow-up"] as const;
type ReviewLabOperation = (typeof operations)[number];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ operation: string }> },
) {
  const context = createPublicRequestContext(request, "api.internal.review_lab.run");
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: jsonHeaders(context) });
  }

  const { operation: rawOperation } = await params;
  if (!operations.includes(rawOperation as ReviewLabOperation)) {
    return NextResponse.json({ error: "Unknown review lab operation." }, { status: 404, headers: jsonHeaders(context) });
  }
  const operation = rawOperation as ReviewLabOperation;
  const originCheck = enforceSameOriginRequest(request, context, "review_lab");
  if ("response" in originCheck) return originCheck.response;
  const contentTypeCheck = requireContentType(request, context, "review_lab");
  if ("response" in contentTypeCheck) return contentTypeCheck.response;

  try {
    const body = await readJsonBody(request, REQUEST_BODY_LIMITS.reviewExtensionJson);
    const output = await runOperation(operation, body);
    logRequestEvent("info", "review_lab.completed", context, { operation });
    return NextResponse.json(output, { headers: jsonHeaders(context) });
  } catch (error) {
    const bodyError = getRequestBodyError(error);
    if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
    logRequestEvent("warn", "review_lab.rejected", context, { operation });
    return NextResponse.json({ error: "The review lab input is invalid." }, { status: 400, headers: jsonHeaders(context) });
  }
}

async function runOperation(operation: ReviewLabOperation, body: unknown) {
  if (operation === "critique") {
    const [{ reviewRequestSchema }, { createDemoReview }] = await Promise.all([
      import("@/domain/review"),
      import("@/domain/demo-review"),
    ]);
    return createDemoReview(reviewRequestSchema.parse(body));
  }
  if (operation === "improvement") {
    const [{ improvementRequestSchema }, { createDemoImprovementPlan }] = await Promise.all([
      import("@/domain/improvement"),
      import("@/domain/demo-review"),
    ]);
    return createDemoImprovementPlan(improvementRequestSchema.parse(body));
  }
  if (operation === "comparison") {
    const [{ comparisonRequestSchema }, { createDemoComparison }] = await Promise.all([
      import("@/domain/comparison"),
      import("@/domain/demo-comparison"),
    ]);
    return createDemoComparison(comparisonRequestSchema.parse(body));
  }
  const [{ followUpRequestSchema }, { createDemoFollowUp }] = await Promise.all([
    import("@/domain/follow-up"),
    import("@/domain/demo-follow-up"),
  ]);
  return createDemoFollowUp(followUpRequestSchema.parse(body));
}
