import { z } from "zod";

export const accountExportRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
});

export const accountExportEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime(),
  profile: z.strictObject({
    createdAt: z.string().nullable(),
    displayName: z.string().nullable(),
    email: z.email().nullable(),
    emailVerified: z.boolean(),
  }),
  learning: z.unknown(),
  reviews: z.array(z.unknown()),
  reviewDrafts: z.array(z.unknown()),
  comparisons: z.array(z.unknown()),
  messages: z.array(z.unknown()),
  caseStudies: z.array(z.unknown()),
}).strict();

export type AccountExportEnvelope = z.infer<typeof accountExportEnvelopeSchema>;
