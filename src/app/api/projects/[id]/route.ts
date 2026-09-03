import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { projectDeleteSchema, projectPatchSchema } from "@/domain/project";
import { AccountDeletionInProgressError } from "@/server/account-deletion-lock";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { FirebaseAdminUnavailableError } from "@/server/firebase-admin";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { deleteProject, getProjectForUser, patchProject, ProjectStorageError } from "@/server/project-storage";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

const PROJECT_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };
type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, routeContext: RouteContext) {
  const access = await authorize(request, "read", false);
  if ("response" in access) return access.response;
  try {
    const project = await getProjectForUser(access.auth.user.uid, (await routeContext.params).id);
    return NextResponse.json({ project }, { headers: jsonHeaders(access.context) });
  } catch (error) {
    return handleError(error, access.context, "read");
  }
}

export async function PATCH(request: Request, routeContext: RouteContext) {
  const access = await authorize(request, "update", true);
  if ("response" in access) return access.response;
  try {
    const input = projectPatchSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.projectsJson));
    const project = await patchProject(access.auth.user.uid, (await routeContext.params).id, input);
    logRequestEvent("info", "project.updated", access.context, { user: access.auth.userLogId });
    return NextResponse.json({ project }, { headers: jsonHeaders(access.context) });
  } catch (error) {
    return handleError(error, access.context, "update");
  }
}

export async function DELETE(request: Request, routeContext: RouteContext) {
  const access = await authorize(request, "delete", true);
  if ("response" in access) return access.response;
  try {
    const input = projectDeleteSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.projectsJson));
    const result = await deleteProject(access.auth.user.uid, (await routeContext.params).id, input);
    logRequestEvent("info", "project.deleted", access.context, { transferredArtifacts: result.transferredArtifacts, user: access.auth.userLogId });
    return NextResponse.json(result, { headers: jsonHeaders(access.context) });
  } catch (error) {
    return handleError(error, access.context, "delete");
  }
}

async function authorize(request: Request, action: string, mutation: boolean) {
  const context = createRequestContext(request, `api.projects.${action}`);
  const origin = enforceSameOriginRequest(request, context, `project_${action}`);
  if ("response" in origin) return { response: origin.response };
  if (mutation) {
    const contentType = requireContentType(request, context, `project_${action}`);
    if ("response" in contentType) return { response: contentType.response };
  }
  const auth = await requireVerifiedFirebaseUser(request, context, `project_${action}`, { missing: "Sign in again before updating Projects." });
  if ("response" in auth) return { response: auth.response };
  const rateLimit = await enforceRateLimit({ context, eventPrefix: `project_${action}`, key: `project:${action}:${auth.user.uid}`, message: "Too many project requests. Please try again shortly.", request, ...PROJECT_RATE_LIMIT });
  if ("response" in rateLimit) return { response: rateLimit.response };
  return { auth, context };
}

function handleError(error: unknown, context: ReturnType<typeof createRequestContext>, action: string) {
  const bodyError = getRequestBodyError(error);
  if (bodyError) return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: jsonHeaders(context) });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: jsonHeaders(context) });
  if (error instanceof ZodError) return NextResponse.json({ error: "Project details are incomplete or invalid." }, { status: 400, headers: jsonHeaders(context) });
  if (error instanceof ProjectStorageError) return NextResponse.json({ error: error.message, details: error.details }, { status: error.status, headers: jsonHeaders(context) });
  if (error instanceof AccountDeletionInProgressError) return NextResponse.json({ error: error.message }, { status: error.status, headers: jsonHeaders(context) });
  if (error instanceof FirebaseAdminUnavailableError) return NextResponse.json({ error: "Projects are not available right now." }, { status: 503, headers: jsonHeaders(context) });
  logRequestEvent("error", `project.${action}.failed`, context);
  return NextResponse.json({ error: "Projects could not be updated." }, { status: 500, headers: jsonHeaders(context) });
}
