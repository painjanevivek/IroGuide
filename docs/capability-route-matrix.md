# Capability and Route Matrix

Status: Authoritative launch contract
Last verified: 2026-08-24

The server-resolved capability object is authoritative. UI labels may explain a denial but never grant access. Invalid production configuration resolves to `free`.

## Capability matrix

| Capability | Development | Free production | Later full production | Authority |
| --- | --- | --- | --- | --- |
| AI critique | deterministic demo | off | provider + entitlement + readiness | server policy, then API |
| Source-image creation/read | off by default | off; historical deletion still runs | private owned Storage only | server + Storage rules |
| Bug-report storage | on with Firebase Admin | on | on | API repository |
| Bug-report email | off | off | verified sender/recipient only | server capability |
| Community | off | off | still off until separate approval | server + Firestore rules deploy |
| Billing | absent | absent | separate approved phase | server entitlements/webhooks |

## Page routes

| Route | Audience | Free behavior | Full behavior | Data boundary |
| --- | --- | --- | --- | --- |
| `/`, `/about`, `/docs` | public | product education with honest availability labels | same plus enabled review action | no private data |
| `/projects` | public | active workspace plus clearly labeled planned workflows | capability-aware | no private data |
| `/pricing` | public | research preview; no checkout or promised quota | unchanged until billing approval | no payment state |
| `/community` | public shell | explicit gated state; no live documents | gated | Firestore reads denied |
| `/portfolio` | public/auth-aware | private preparation concept | private evidence only until approved | owned reviews only |
| `/review/new` | signed-in | unavailable state; no upload/provider request | four-step review flow | auth + capability + body budget |
| `/dashboard` | signed-in | history, drafts, compatible progress, deletion | same plus enabled creation links | UID-scoped Firestore/Storage |
| `/dashboard/reviews/[documentId]` | signed-in | readable owned critique; extensions unavailable | capability-aware extensions | UID ownership |
| `/profile` | signed-in | profile and destructive data controls | same | recent auth for deletion |
| `/admin/bug-reports` | allowlisted admin | privileged diagnostics | same | verified allowlist |
| `/beta` | public diagnostic shell | privacy-safe readiness only | same | no configuration details |

## API routes

| Route | Free result | Full prerequisite | Body budget |
| --- | --- | --- | --- |
| `POST /api/reviews` | policy denial before body/provider | verified email, entitlement, live readiness | JSON 512 KiB; multipart 4.45 MB |
| `POST /api/reviews/sync` | owned text sync; source image not persisted | Storage capability for image persistence | JSON 2 MiB; multipart 4.45 MB |
| `POST /api/follow-ups` | policy denial | owned trusted review and AI capability | 4.45 MB hard ceiling; schema is smaller |
| `POST /api/comparisons` | policy denial | owned compatible review and AI capability | 4.45 MB hard ceiling |
| `POST /api/improvements` | policy denial | owned trusted review and AI capability | 4.45 MB hard ceiling |
| `POST /api/reviews/feedback` | owner-authorized | same | 64 KiB |
| `POST /api/community` | 404 before authentication/mutation | not available in current profiles | 64 KiB if activated later |
| `POST /api/bug-reports` | stored; email disabled | email capability for delivery | 32 KiB |
| `DELETE /api/account/reviews` | bounded review/draft/feedback/image cleanup | recent authentication | no request body |
| `DELETE /api/account` | cleanup before identity removal | recent authentication | no request body |
| `GET /api/readiness` | boolean only | trusted client identity and core Firebase | none |
| `GET /api/admin/readiness` | allowlisted diagnostics | verified admin identity | none |

## Rendering and disclosure

- Server-render the route shell and capability decision.
- Load private Firebase state only after authentication is established.
- Show one of loading, empty, unavailable, error, or content; never stack contradictory states.
- Defer image URL resolution and optional review extensions until primary review text exists.
- Paginate when a collection can exceed its current bounded first page.
- Never preload or call a paid/disabled API from an unavailable UI.
