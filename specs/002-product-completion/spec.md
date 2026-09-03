# Product Completion Specification

## Objective

Ship a production-grade free IroGuide product while making every unavailable or
evidence-gated capability explicit, independently enforceable, observable, and
safe to activate later.

## Requirements

- **REM-FR-001:** The canonical remediation plan and Spec Kit mirror must remain
  mechanically synchronized.
- **REM-FR-002:** Every product capability must have an independent, server-owned,
  fail-closed gate used by both its API and UI.
- **REM-FR-003:** Demo critique, improvement, comparison, and follow-up code must
  be reachable only from a development-only internal review lab and never from a
  production provider path.
- **REM-FR-004:** Signed-in users must be able to create, rename, archive, restore,
  filter, transfer, and safely delete owner-scoped projects.
- **REM-FR-005:** Existing artifacts without a project must remain readable in a
  virtual Unsorted project without destructive migration.
- **REM-FR-006:** Public readiness must expose only `{ ok }`; detailed readiness
  requires recent verified operator authorization.
- **REM-FR-007:** Bug reports must remain authoritative in Firestore and support
  operator-only assignment, notes, status, and resolution metadata.
- **REM-FR-008:** The free product must not trigger provider, source-image,
  outbound-email, Community, publishing, or Billing side effects.
- **REM-FR-009:** Provider and retention features may activate only after their
  named gates pass and must use the signed-upload durable-job pipeline.
- **REM-FR-010:** Portfolio, Community, and Billing must remain lightweight,
  truthful, and closed until their separate evidence and safety gates pass.
- **REM-NFR-001:** Changes must preserve owner isolation, same-origin checks,
  access locks, idempotency, optimistic concurrency, bounded inputs, and deletion.
- **REM-NFR-002:** Supported routes must meet accessibility, responsive,
  performance, security, rollback, and exact-SHA release requirements.

## Success criteria

The free journey passes locally and in authorized staging; all closed capabilities
fail before side effects; the required validation commands pass; and no gate is
represented as approved without its real evidence record.
