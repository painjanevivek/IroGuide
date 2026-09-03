import { z } from "zod";
import { reviewCategories } from "./review";

export const PROJECT_SCHEMA_VERSION = 1 as const;
export const UNSORTED_PROJECT_ID = "unsorted" as const;
export const projectStatuses = ["active", "archived"] as const;

const projectIdSchema = z.string().uuid();
const mutationIdSchema = z.string().min(8).max(128).regex(/^[A-Za-z0-9_.:-]+$/);
const timestampSchema = z.iso.datetime({ offset: true });

export const projectArtifactCountsSchema = z.strictObject({
  briefs: z.number().int().nonnegative(),
  selfReviews: z.number().int().nonnegative(),
  reviews: z.number().int().nonnegative(),
  reviewJobs: z.number().int().nonnegative(),
  comparisons: z.number().int().nonnegative(),
  caseStudies: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const projectSchema = z.strictObject({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  id: projectIdSchema,
  userId: z.string().min(1).max(128),
  name: z.string().trim().min(1).max(80),
  category: z.enum(reviewCategories).nullable(),
  goal: z.string().trim().max(320),
  status: z.enum(projectStatuses),
  revision: z.number().int().nonnegative(),
  artifactCounts: projectArtifactCountsSchema,
  nextAction: z.enum(["start-learning", "prepare-brief", "continue-project", "review-archive"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  recentMutationIds: z.array(mutationIdSchema).max(20),
});

export const publicProjectSchema = projectSchema.omit({ userId: true, recentMutationIds: true });

export const unsortedProjectSchema = z.strictObject({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  id: z.literal(UNSORTED_PROJECT_ID),
  name: z.literal("Unsorted"),
  category: z.null(),
  goal: z.string(),
  status: z.literal("active"),
  revision: z.literal(0),
  artifactCounts: projectArtifactCountsSchema,
  nextAction: z.literal("continue-project"),
  createdAt: z.null(),
  updatedAt: z.null(),
  virtual: z.literal(true),
});

export const projectCreateSchema = z.strictObject({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  mutationId: mutationIdSchema,
  name: z.string().trim().min(1).max(80),
  category: z.enum(reviewCategories).nullable().default(null),
  goal: z.string().trim().max(320).default(""),
});

export const projectPatchSchema = z.strictObject({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  expectedRevision: z.number().int().nonnegative(),
  mutationId: mutationIdSchema,
  changes: z.strictObject({
    name: z.string().trim().min(1).max(80).optional(),
    category: z.enum(reviewCategories).nullable().optional(),
    goal: z.string().trim().max(320).optional(),
    status: z.enum(projectStatuses).optional(),
  }).refine((changes) => Object.keys(changes).length > 0, "At least one project change is required."),
});

export const projectDeleteSchema = z.strictObject({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  expectedRevision: z.number().int().nonnegative(),
  mutationId: mutationIdSchema,
  transferToProjectId: z.union([projectIdSchema, z.literal(UNSORTED_PROJECT_ID)]).nullable().optional(),
});

export type Project = z.infer<typeof projectSchema>;
export type PublicProject = z.infer<typeof publicProjectSchema>;
export type UnsortedProject = z.infer<typeof unsortedProjectSchema>;
export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type ProjectPatch = z.infer<typeof projectPatchSchema>;
export type ProjectDelete = z.infer<typeof projectDeleteSchema>;
export type ProjectArtifactCounts = z.infer<typeof projectArtifactCountsSchema>;

export function emptyProjectArtifactCounts(): ProjectArtifactCounts {
  return { briefs: 0, selfReviews: 0, reviews: 0, reviewJobs: 0, comparisons: 0, caseStudies: 0, total: 0 };
}

export function withProjectArtifactTotal(counts: Omit<ProjectArtifactCounts, "total">): ProjectArtifactCounts {
  return projectArtifactCountsSchema.parse({
    ...counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  });
}

export function deriveProjectNextAction(project: Pick<Project, "status" | "artifactCounts">): Project["nextAction"] {
  if (project.status === "archived") return "review-archive";
  if (project.artifactCounts.total === 0) return "start-learning";
  if (project.artifactCounts.briefs === 0) return "prepare-brief";
  return "continue-project";
}
