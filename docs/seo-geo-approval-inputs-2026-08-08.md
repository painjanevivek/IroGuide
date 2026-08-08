# SEO, GEO, and AEO: required approvals and inputs

**Status:** follow-up to `seo-geo-audit-2026-08-08.md`. This file contains only work that cannot be safely automated without a business decision, human review, permission, or external-system access.

## Completed automation

- `/beta` is excluded from indexing with `noindex`, `nofollow`, and `nocache` metadata.
- `/beta` is removed from the XML sitemap.
- Sitemap entries no longer publish a generated `lastModified` date; a date will only be added when it can be verified.
- Automated tests protect these controls from accidental regression.
- Existing analytics was reviewed: it requires consent, sanitizes event parameters, and tracks sign-up submission interactions without including form fields. No duplicate tracking was added.

## Decisions required before the next code or content change

| Decision | Owner | Why a human decision is required | Needed outcome |
|---|---|---|---|
| Beta-route access policy | Product + security | `noindex` prevents search discovery but does not restrict direct access to public diagnostics. | Choose one: keep public as a limited launch page, require sign-in, or allow only non-production environments. |
| Product and pricing facts | Product owner | Schema and marketing copy must match actual capabilities and the live offer. | Confirm supported design inputs, critique dimensions, privacy controls, price, currency, availability, and whether the pricing page is a preview. |
| Privacy and legal statements | Legal + privacy owner | Provider disclosure, deletion, retention, sharing, and data-flow claims have legal implications. | Approve any revised privacy-page or homepage wording before publication. |
| Public proof | Product + customer owner | Screenshots, critique examples, and customer stories may expose confidential design work. | Supply permissioned/redacted assets and written publishing consent. |
| Editorial expertise | Content lead | Guidance about critique, portfolios, accessibility, and careers should not be represented as unreviewed AI expertise. | Assign a named author/reviewer with relevant credentials for every guide. |
| International scope | Product + content | The current site is English-only. Localization requires real translations, market fit, and reciprocal technical annotations. | Confirm target locales before any hreflang or localized page work. |

## Read-only access required for measurement

Grant read-only access; do not share passwords, API keys, user exports, uploaded designs, critique text, or private prompts.

| System | Minimum access | What it enables |
|---|---|---|
| Google Search Console | Property-level read access | Index coverage, crawl errors, impressions, clicks, CTR, position, query/page performance, URL inspection. |
| Bing Webmaster Tools | Read access plus Bing AI Performance if available | Bing visibility, crawl/indexing signals, and AI-search performance where available. |
| GA4 or equivalent | Read-only analyst access | Organic sign-ups, landing-page conversion, assisted conversion, and event QA. |
| Vercel Analytics/Speed Insights or RUM | Read-only project access | Core Web Vitals by device/page and production experience issues. |
| Product analytics consent settings | Read-only configuration review | Confirms sign-up and SEO events respect consent and exclude sensitive content. |

## Content package required before publishing the first four guides

Do not create thin or generic pages. For each guide, provide or approve the items below.

| Guide | Required original value | Required review |
|---|---|---|
| How to critique a design | A worked, annotated critique example and a usable framework. | Practicing designer or design educator. |
| Design feedback checklist | A field-tested checklist, including when not to use it. | Design practitioner. |
| Portfolio review checklist | Specific case-study criteria; no promised hiring outcome. | Hiring manager or experienced portfolio reviewer. |
| Turn critique into a case study | A permissioned/redacted before-and-after narrative or template. | Portfolio reviewer plus privacy approval. |

Each published guide also needs: approved title/H1/description, source links, author/reviewer name and bio, visible verified-update date, product screenshot permission, internal-link targets, and CTA language.

## Validation required after approval and deployment

- Confirm the public page, canonical, robots metadata, sitemap, and mobile rendering in the deployed environment.
- Validate matching visible content and structured data with Schema Markup Validator and Google Rich Results Test.
- Inspect the affected URL in Google Search Console and Bing after the next crawl.
- Test organic-sign-up event capture with consent accepted and declined; confirm no sensitive fields are sent.
- Compare indexed pages, non-branded impressions, organic sign-ups, and Core Web Vitals against the 28-day baseline before expanding the content program.
