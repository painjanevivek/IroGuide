# Product Activation Evidence Index

Each phase owns `phase-N/README.md` and optional checked-in textual evidence. Large screenshots, Playwright reports, traces, credentials, signed URLs, and generated build output remain outside Git and are referenced by reproducible location or command.

An evidence record contains: entry criteria, starting and ending SHA, changed capabilities, focused validation, full gate result, browser/accessibility inspection, security/privacy review, rollback, residual constraints, gate outcome, and commit/push confirmation.

File names use lowercase kebab case and never include account identifiers, email addresses, secrets, tokens, signed URLs, private briefs, review text, or user images.

| Phase | Record | Outcome |
|---|---|---|
| 0 | `phase-0/README.md` | Passed locally and pushed |
| 1 | `phase-1/README.md` | Passed locally; push recorded in Git history |
