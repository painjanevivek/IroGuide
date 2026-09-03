import { z } from "zod";

export const BUG_REPORT_SCHEMA_VERSION = 1 as const;
export const bugReportStatuses = ["new", "triaged", "in-progress", "resolved", "closed"] as const;

export const bugReportRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  problem: z.string().trim().min(10).max(2_000),
  pageUrl: z.string().trim().url().max(500).optional(),
  company: z.string().trim().max(0).optional(),
});

export type BugReportRequest = z.infer<typeof bugReportRequestSchema>;

export const bugReportWorkflowUpdateSchema = z.strictObject({
  schemaVersion: z.literal(BUG_REPORT_SCHEMA_VERSION),
  reportId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().min(8).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
  changes: z.strictObject({
    status: z.enum(bugReportStatuses).optional(),
    assignedTo: z.string().trim().min(2).max(120).nullable().optional(),
    internalNote: z.string().trim().min(2).max(2_000).optional(),
    resolution: z.string().trim().min(2).max(2_000).nullable().optional(),
  }).refine((changes) => Object.keys(changes).length > 0, "At least one workflow change is required."),
});

export type BugReportWorkflowUpdate = z.infer<typeof bugReportWorkflowUpdateSchema>;
export type BugReportStatus = (typeof bugReportStatuses)[number];
