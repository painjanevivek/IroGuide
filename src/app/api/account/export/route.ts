import { NextResponse } from "next/server";
import { accountExportRequestSchema } from "@/domain/account-export";
import { AccountDeletionInProgressError } from "@/server/account-deletion-lock";
import { AccountExportTooLargeError, buildAccountExport } from "@/server/account-export";
import { createPublicRequestContext, enforceRateLimit, enforceSameOriginRequest, requireContentType } from "@/server/api-security";
import { FirebaseTokenVerificationError, verifyRecentFirebaseIdToken } from "@/server/firebase-admin";
import { jsonHeaders, logRequestEvent } from "@/server/observability";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = createPublicRequestContext(request, "api.account.export");
  const origin = enforceSameOriginRequest(request, context, "account_export");
  if ("response" in origin) return origin.response;
  const contentType = requireContentType(request, context, "account_export");
  if ("response" in contentType) return contentType.response;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Sign in again before exporting account data." }, { status: 401, headers: jsonHeaders(context) });
  try {
    const user = await verifyRecentFirebaseIdToken(authorization.slice("Bearer ".length).trim());
    const rateLimit = await enforceRateLimit({ context, eventPrefix: "account_export", key: `account-export:${user.uid}`, limit: 3, message: "Too many export requests. Try again later.", request, windowMs: 60 * 60 * 1_000 });
    if ("response" in rateLimit) return rateLimit.response;
    accountExportRequestSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.activationJson));
    const exported = await buildAccountExport(user.uid);
    logRequestEvent("info", "account_export.completed", context);
    return new Response(JSON.stringify(exported, null, 2), { status: 200, headers: { ...jsonHeaders(context), "Cache-Control": "private, no-store, max-age=0", "Content-Disposition": `attachment; filename="iroguide-account-export-${exported.exportedAt.slice(0, 10)}.json"`, "Content-Type": "application/json; charset=utf-8", Pragma: "no-cache" } });
  } catch (error) {
    const bodyError = getRequestBodyError(error);
    if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
    if (error instanceof FirebaseTokenVerificationError) return NextResponse.json({ error: "Sign in again recently before exporting account data." }, { status: 401, headers: jsonHeaders(context) });
    if (error instanceof AccountDeletionInProgressError) return NextResponse.json({ error: "Account data is locked while deletion is in progress." }, { status: 423, headers: jsonHeaders(context) });
    if (error instanceof AccountExportTooLargeError) return NextResponse.json({ error: error.message }, { status: error.status, headers: jsonHeaders(context) });
    logRequestEvent("error", "account_export.failed", context);
    return NextResponse.json({ error: "Account data could not be exported safely." }, { status: 503, headers: jsonHeaders(context) });
  }
}
