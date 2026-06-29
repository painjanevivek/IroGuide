import { z } from "zod";

export const bugReportRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  problem: z.string().trim().min(10).max(2_000),
  pageUrl: z.string().trim().url().max(500).optional(),
  company: z.string().trim().max(0).optional(),
});

export type BugReportRequest = z.infer<typeof bugReportRequestSchema>;
