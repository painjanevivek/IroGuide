import { z } from "zod";
import { accessDecisionReasonCodes, accessDecisions, accessInterestStatuses, activationRoles } from "./product-activation";
import { reviewCategories } from "./review";

export const accessOperationsFilterSchema = z.strictObject({
  cohort: z.enum(activationRoles).optional(),
  category: z.enum(reviewCategories).optional(),
  age: z.enum(["0-7-days", "8-30-days", "31-plus-days"]).optional(),
  status: z.enum(accessInterestStatuses).optional(),
});

export const accessDecisionCommandSchema = z.strictObject({
  schemaVersion: z.literal(1),
  eventId: z.uuid(),
  targetUserId: z.string().min(1).max(128),
  expectedRevision: z.number().int().nonnegative(),
  decision: z.enum(accessDecisions),
  reasonCode: z.enum(accessDecisionReasonCodes),
});

export const accessOperationsCandidateSchema = z.strictObject({
  targetUserId: z.string().min(1).max(128),
  revision: z.number().int().nonnegative(),
  cohort: z.enum(activationRoles),
  preferredCategory: z.enum(reviewCategories).nullable(),
  clientWorkIntent: z.enum(["personal-only", "client-safe-only", "unsure"]),
  contactPermission: z.boolean(),
  status: z.enum(accessInterestStatuses),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type AccessOperationsFilter = z.infer<typeof accessOperationsFilterSchema>;
export type AccessDecisionCommand = z.infer<typeof accessDecisionCommandSchema>;
export type AccessOperationsCandidate = z.infer<typeof accessOperationsCandidateSchema>;
