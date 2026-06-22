# IroGuide

Professional, contextual AI critique for visual design work.

This repository follows the phased product plan in
[`AI_Design_Mentor_Phased_Plan.md`](./AI_Design_Mentor_Phased_Plan.md).

## Product documentation

- [Product foundation](./docs/product-foundation.md)
- [UX blueprint](./docs/ux-blueprint.md)
- [Visual system](./docs/design-system.md)
- [Technical architecture](./docs/technical-architecture.md)
- [Trust, safety, and accessibility](./docs/trust-and-safety.md)
- [Launch plan](./docs/launch-plan.md)

The website implementation will evolve phase by phase, with each completed phase
kept in a focused conventional commit.

## Run locally

```bash
npm run install:all
npm run dev
```

Open `http://localhost:3000`. The frontend calls the standalone backend at
`http://localhost:4000`. The current backend uses a transparent,
deterministic demo provider so the complete interaction can be evaluated without
claiming to inspect image pixels.

## Repository structure

```text
frontend/   Next.js website and browser-side product experience
backend/    Fastify API, review domain, quality rules, and provider services
docs/       Product, UX, architecture, trust, and launch documentation
```

Each application has its own `package.json`, environment example, test setup,
and build pipeline. Root scripts orchestrate both applications for convenience.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
