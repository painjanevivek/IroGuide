# DinoDesign

Professional, contextual AI critique for visual design work.

This repository follows the phased product plan in
[`AI_Design_Mentor_Phased_Plan.md`](./AI_Design_Mentor_Phased_Plan.md).

## Product documentation

- [Product foundation](./docs/product-foundation.md)
- [UX blueprint](./docs/ux-blueprint.md)
- [Visual system](./docs/design-system.md)
- [Technical architecture](./docs/technical-architecture.md)
- [Trust, safety, and accessibility](./docs/trust-and-safety.md)

The website implementation will evolve phase by phase, with each completed phase
kept in a focused conventional commit.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The current review endpoint uses a transparent,
deterministic demo provider so the complete interaction can be evaluated without
claiming to inspect image pixels. Copy `.env.example` to `.env.local` when a live
provider adapter is implemented.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
