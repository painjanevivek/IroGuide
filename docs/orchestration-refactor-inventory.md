# Orchestration Refactor Inventory

Status: Phase 1 discovery; behavior changes belong to Phase 2

| Area | Current responsibility concentration | Safe extraction seam | Required safety net |
| --- | --- | --- | --- |
| `ReviewStudio` | draft restore/save, file lifecycle, four-step state, submit, persistence, result | `useReviewDraft`, `useReviewSubmission`, file validation service | free/full Playwright, route tests, draft rules |
| `AuthProvider` | session, avatar, auth transitions, local E2E behavior | session adapter and profile-image hook | auth route/component tests, E2E sign-in |
| `CommunityBoard` | reads, optimistic reactions, comments, publication UI | no refactor while gated; preserve behind capability | gated direct URL/API/rules tests |
| `Dashboard` | draft query, image URL hydration, progress projection, rendering | `useReviewDrafts`, `usePrivateReviewImages`, progress view model | account review unit tests, dashboard E2E |

Extraction rules: one responsibility per change, no visual redesign, no new shared abstraction until two real consumers exist, client/server imports remain explicit, and every extraction must preserve loading, empty, unavailable, error, and success states.
