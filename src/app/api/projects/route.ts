import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { projectCreateSchema } from "@/domain/project";
import { AccountDeletionInProgressError } from "@/server/account-deletion-lock";
import { enforceRateLimit, enforceSameOriginRequest, requireContentType, requireVerifiedFirebaseUser } from "@/server/api-security";
import { FirebaseAdminUnavailableError } from "@/server/firebase-admin";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { createProject, listProjectsForUser, ProjectStorageError } from "@/server/project-storage";
import { getRequestBodyError, readJsonBody, REQUEST_BODY_LIMITS } from "@/server/request-body";

const PROJECT_READ_LIMIT = { limit: 120, windowMs: 10 * 60 * 1000 };
const PROJECT_MUTATION_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await authorizeProjectRequest(request, "list", false);
  if ("response" in access) return access.response;
  try {
    const result = await listProjectsForUser(access.auth.user.uid);
    return NextResponse.json(result, { headers: jsonHeaders(access.context) });
  } catch (error) {
    return projectErrorResponse(error, access.context, "list");
  }
}

export async function POST(request: Request) {
  const access = await authorizeProjectRequest(request, "create", true);
  if ("response" in access) return access.response;
  try {
    const input = projectCreateSchema.parse(await readJsonBody(request, REQUEST_BODY_LIMITS.projectsJson));
    const project = await createProject(access.auth.user.uid, input);
    logRequestEvent("info", "project.created", access.context, { user: access.auth.userLogId });
    return NextResponse.json({ project }, { status: 201, headers: jsonHeaders(access.context) });
  } catch (error) {
    return projectErrorResponse(error, access.context, "create");
  }
}

async function authorizeProjectRequest(request: Request, action: string, mutation: boolean) {
  const context = createRequestContext(request, `api.projects.${action}`);
  const origin = enforceSameOriginRequest(request, context, `project_${action}`);
  if ("response" in origin) return { response: origin.response };
  if (mutation) {
    const contentType = requireContentType(request, context, `project_${action}`);
    if ("response" in contentType) return { response: contentType.response };
  }
  const auth = await requireVerifiedFirebaseUser(request, context, `project_${action}`, { missing: "Sign in again before opening Projects." });
  if ("response" in auth) return { response: auth.response };
  const rateLimit = await enforceRateLimit({
    context,
    eventPrefix: `project_${action}`,
    key: `project:${action}:${auth.user.uid}`,
    message: "Too many project requests. Please try again shortly.",
    request,
    ...(mutation ? PROJECT_MUTATION_LIMIT : PROJECT_READ_LIMIT),
  });
  if ("response" in rateLimit) return { response: rateLimit.response };
  return { auth, context };
}

function projectErrorResponse(error: unknown, context: ReturnType<typeof createRequestContext>, action: string) {
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
