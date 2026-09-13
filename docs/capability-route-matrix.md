# Capability and Route Matrix

Status: Authoritative launch contract
Last verified: 2026-09-03

The server-resolved capability object is authoritative. UI labels may explain a denial but never grant access. Invalid production configuration resolves to `free`.

## Capability matrix

| Capability | Default state | Activation boundary | Authority |
| --- | --- | --- | --- |
| Guided learning | off unless explicitly enabled | owner-scoped Phase 2 APIs and readiness | `IROGUIDE_CAPABILITY_GUIDED_LEARNING` |
| Live critique | off | Provider GO, entitlement, readiness, quotas, and kill switch | `IROGUIDE_CAPABILITY_LIVE_CRITIQUE` |
| Improvement tracking | off | verified owned review and Retention gate | `IROGUIDE_CAPABILITY_IMPROVEMENT_TRACKING` |
| Revision comparison | off | compatible verified evidence and Retention gate | `IROGUIDE_CAPABILITY_REVISION_COMPARISON` |
| Follow-up conversation | off | owned review, bounded conversation, and Retention gate | `IROGUIDE_CAPABILITY_FOLLOW_UP_CONVERSATION` |
| Private/public Portfolio | off independently | Portfolio gate; public additionally requires consent/revocation | private/public Portfolio capability |
| Community | off | staff-first safety rollout and rules deployment | `IROGUIDE_CAPABILITY_COMMUNITY` + server safety mode |
| Billing | off and provider absent | separate approved billing phase | `IROGUIDE_CAPABILITY_BILLING` |
| Product evidence | off | consented, privacy-safe first-party collection | `IROGUIDE_CAPABILITY_PRODUCT_EVIDENCE` |
| Bug-report email | off; Firestore remains authoritative | accepted provider/privacy/retry/bounce/support operations | `IROGUIDE_CAPABILITY_BUG_REPORT_EMAIL` |
| Review pipeline / source images | off independently | invited cohort and validated owner-bound infrastructure | exact pipeline and Storage capabilities |

## Page routes

| Route | Audience | Free behavior | Full behavior | Data boundary |
| --- | --- | --- | --- | --- |
| `/`, `/about`, `/docs` | public | product education with honest availability labels | same plus enabled review action | no private data |
| `/learn`, `/learn/examples/[sampleId]` | public/auth-aware | owned examples; signed-in progress only when guided learning is enabled | same | public sample data; private progress via API |
| `/onboarding` | signed-in | resumable three-decision setup after Phase 3 | same | owner-scoped account experience API |
| `/projects` | signed-in | owner-scoped project workspace with virtual Unsorted compatibility | same | server API; direct Firebase denied |
| `/pricing` | public | research preview; no checkout or promised quota | unchanged until billing approval | no payment state |
| `/community` | public shell | explicit gated state; no live documents | gated | Firestore reads denied |
| `/portfolio` | public/auth-aware | private preparation concept | private evidence only until approved | owned reviews only |
| `/review/new` | signed-in | unavailable state; no upload/provider request | four-step review flow | auth + capability + body budget |
| `/dashboard` | signed-in | history, drafts, compatible progress, deletion | same plus enabled creation links | UID-scoped Firestore/Storage |
| `/dashboard/reviews/[documentId]` | signed-in | readable owned critique; extensions unavailable | capability-aware extensions | UID ownership |
| `/profile` | signed-in | profile and destructive data controls | same | recent auth for deletion |
| `/admin/bug-reports` | allowlisted admin | private inbox and support workflow | same | verified allowlist; internal notes never enter reporter responses |
| `/status` | public | health boolean rendered as Operational/Degraded | same | no configuration details |
| `/admin/readiness` | allowlisted recent-auth admin | detailed operator diagnostics | same | recent token + verified allowlist |
| `/beta` | public | permanent redirect to `/status` | same | no configuration details |

## API routes

| Route | Free result | Full prerequisite | Body budget |
| --- | --- | --- | --- |
| `GET/PATCH /api/account/experience` | owner-scoped activation state when guided learning is enabled | same | 32 KiB mutation |
| `GET/POST /api/projects` and `GET/PATCH/DELETE /api/projects/[id]` | owner-scoped projects, revisions, idempotency, and safe transfer/delete | same | 16 KiB mutation |
| `GET/POST/PATCH/DELETE /api/self-reviews` | owner-scoped image-free learning records | same | 32 KiB |
| `GET/PUT/DELETE /api/design-briefs` | owner-scoped image-free drafts | same | 32 KiB |
| `POST/DELETE /api/access-interest` | idempotent contact preference; no email | approved operator invitation for later entitlement | 8 KiB |
| `POST /api/account/export` | bounded owner-scoped JSON attachment after Phase 6 | same | no creative request body |
| `POST /api/reviews` | policy denial before body/provider | verified email, entitlement, live readiness | JSON 512 KiB; multipart 4.45 MB |
| `POST /api/reviews/sync` | owned text sync; source image not persisted | Storage capability for image persistence | JSON 2 MiB; multipart 4.45 MB |
| `POST /api/follow-ups` | policy denial | owned trusted review and AI capability | 4.45 MB hard ceiling; schema is smaller |
| `POST /api/comparisons` | policy denial | owned compatible review and AI capability | 4.45 MB hard ceiling |
| `POST /api/improvements` | policy denial | owned trusted review and AI capability | 4.45 MB hard ceiling |
| `POST /api/reviews/feedback` | owner-authorized | same | 64 KiB |
| `POST /api/community` | 404 before authentication/mutation | not available in current profiles | 64 KiB if activated later |
| `POST /api/bug-reports` | stored; email disabled | email capability for delivery | 32 KiB |
| `GET/PATCH /api/admin/bug-reports` | allowlisted support inbox/workflow | same | 32 KiB mutation |
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
