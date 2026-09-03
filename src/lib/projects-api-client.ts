import type { User } from "firebase/auth";
import { publicProjectSchema, unsortedProjectSchema, type ProjectCreate, type ProjectDelete, type ProjectPatch, type PublicProject, type UnsortedProject } from "@/domain/project";

export class ProjectsRequestError extends Error {
  constructor(message: string, readonly status: number, readonly details?: unknown) {
    super(message);
    this.name = "ProjectsRequestError";
  }
}

export async function listProjects(user: User) {
  const payload = await request(user, "/api/projects");
  if (!isRecord(payload) || !Array.isArray(payload.projects)) throw new ProjectsRequestError("Projects returned an invalid response.", 502);
  return {
    projects: payload.projects.map((project) => publicProjectSchema.parse(project)),
    unsorted: unsortedProjectSchema.parse(payload.unsorted),
    truncatedArtifacts: payload.truncatedArtifacts === true,
  };
}

export async function createProject(user: User, input: ProjectCreate) {
  const payload = await request(user, "/api/projects", jsonRequest("POST", input));
  if (!isRecord(payload)) throw new ProjectsRequestError("Projects returned an invalid response.", 502);
  return publicProjectSchema.parse(payload.project);
}

export async function updateProject(user: User, id: string, input: ProjectPatch) {
  const payload = await request(user, `/api/projects/${encodeURIComponent(id)}`, jsonRequest("PATCH", input));
  if (!isRecord(payload)) throw new ProjectsRequestError("Projects returned an invalid response.", 502);
  return publicProjectSchema.parse(payload.project);
}

export async function removeProject(user: User, id: string, input: ProjectDelete) {
  return request(user, `/api/projects/${encodeURIComponent(id)}`, jsonRequest("DELETE", input));
}

export type ProjectListItem = PublicProject | UnsortedProject;

async function request(user: User, path: string, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : "Projects could not be updated.";
    throw new ProjectsRequestError(message, response.status, isRecord(payload) ? payload.details : undefined);
  }
  return payload;
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
