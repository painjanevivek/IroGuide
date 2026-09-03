# Product Completion Data Model

## Project

Owner-scoped record with `schemaVersion`, `id`, `userId`, `name`, `category`,
`goal`, `status`, `revision`, `artifactCounts`, `nextAction`, `createdAt`,
`updatedAt`, and bounded recent mutation IDs. `status` is `active` or `archived`.

`Unsorted` is a virtual project for legacy artifacts whose `projectId` is null.
It is never persisted and cannot be renamed or deleted.

## Artifact project reference

Compatible briefs, self-reviews, reviews, jobs, comparisons, and case studies add
a nullable `projectId`. Old records without the field parse as null until an
owner-authorized transfer updates them.

## Support ticket operations

Reporter-visible fields remain separate from operator-only `status`, `assignee`,
`internalNotes`, `resolvedAt`, `resolution`, `revision`, and audit metadata.
