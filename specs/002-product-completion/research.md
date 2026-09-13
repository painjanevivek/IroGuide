# Product Completion Research

## Decisions

- Use independent boolean capabilities resolved only on the server. Client
  capability state is a rendering hint, never an authorization source.
- Preserve legacy unassigned artifacts through a virtual Unsorted project.
- Use Server Components for route shells and small client islands for mutations.
- Use Firebase Admin transactions for owner-scoped optimistic concurrency and
  idempotent mutation IDs; deny direct client access in rules.
- Keep public health minimal and isolate operator diagnostics behind verified,
  recent authentication and explicit operator authorization.
- Treat every human, legal, provider, budget, and production proof as an external
  dependency. A missing dependency yields a truthful closed gate, not simulated
  evidence.

## Next.js 16.3.2 sources consulted

- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
- `node_modules/next/dist/docs/01-app/02-guides/redirecting.md`
