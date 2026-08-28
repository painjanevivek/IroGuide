# Product Activation Evidence Index

Each phase owns `phase-N/README.md` and optional checked-in textual evidence. Large screenshots, Playwright reports, traces, credentials, signed URLs, and generated build output remain outside Git and are referenced by reproducible location or command.

An evidence record contains: entry criteria, starting and ending SHA, changed capabilities, focused validation, full gate result, browser/accessibility inspection, security/privacy review, rollback, residual constraints, gate outcome, and commit/push confirmation.

File names use lowercase kebab case and never include account identifiers, email addresses, secrets, tokens, signed URLs, private briefs, review text, or user images.

| Phase | Record | Outcome |
|---|---|---|
| 0 | `phase-0/README.md` | Passed locally and pushed |
| 1 | `phase-1/README.md` | Passed locally; push recorded in Git history |
| 2 | `phase-2/README.md` | Passed locally; push recorded in Git history |
| 3 | `phase-3/README.md` | Passed locally; push recorded in Git history |
| 4 | `phase-4/README.md` | Passed locally; push recorded in Git history |
| 5 | `phase-5/README.md` | Passed locally; push recorded in Git history |
| 6 | `phase-6/README.md` | Passed locally; push recorded in Git history |
| 7 | `phase-7/README.md` | Gate closed: public proof passed; privileged Firebase and physical-device evidence unavailable |
| 8 | `phase-8/README.md` | Gate closed: research kit prepared; participant outreach not authorized |
| 9 | `phase-9/README.md` | NO-GO: corpus/readiness controls prepared; paid calls and human adjudication absent |
| 10 | `phase-10/README.md` | Dependency closed: provider gate is NO-GO; live critique remains unavailable |
| 11 | `phase-11/README.md` | Dependency closed: no approved live critique or second-review cohort exists |
