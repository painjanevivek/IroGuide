# IroGuide SEO, GEO, and AEO audit

**Audit date:** 2026-08-08  
**Scope:** public `www.iroguide.com` and the local Next.js implementation. Read-only: no production, configuration, analytics, redirect, robots, canonical, or content changes were made.

## A. Executive summary and realistic opportunity assessment

IroGuide has a sound technical base for a pre-launch product: HTTPS works, non-`www` permanently redirects to the canonical host, all 11 sitemap URLs return `200`, canonical tags resolve to `https://www.iroguide.com`, robots permits public pages while blocking known private areas, and the homepage emits Organization, WebSite, WebApplication, and FAQ JSON-LD.

The ceiling is currently content and evidence, not a missing technical primitive. The public indexable footprint is only 11 URLs, mostly product and policy pages. There are no purpose-built pages that answer the non-branded problems people search before they know IroGuide, and no original proof asset that makes a third party or an AI answer engine likely to cite the product. No ranking or traffic outcome is promised.

The first priority is to remove the public discovery path to deployment diagnostics. Then turn the existing product expertise into a small, evidence-led learning hub rather than publishing many thin pages. The strongest early theme is **structured visual design critique that produces prioritized next steps while keeping submitted work private by default**. Do not position IroGuide as a substitute for professional judgment, an accessibility compliance tool, or a Figma-native reviewer unless those claims are verified and supported by the product.

### Assumptions and no-access limitations

- Google Search Console, Bing Webmaster Tools/Bing AI Performance, GA4, Vercel Analytics, conversion data, paid keyword tools, and customer research were not available.
- Live crawl, HTTP, metadata, sitemap, robots, canonical, redirect, and visible-page checks were performed on 2026-08-08. PageSpeed Insights could not supply a lab run because the unauthenticated API quota returned HTTP 429.
- Keyword opportunity scores are directional hypotheses, not search-volume estimates. Validate them with Search Console impressions and current SERPs before publishing.
- The product has a global English audience and the primary conversion is a sign-up, as supplied in the brief.

## B. Technical audit

| Priority | Finding and evidence | Affected URLs | Exact recommended change | Expected effect | Risk and rollback |
|---|---|---|---|---|---|
| High | `/beta` is indexable and is included in the sitemap. Its public copy says it shows Firebase, project alignment, and live review-provider readiness. This is a deployment diagnostic, not a search landing page. | `/beta`, `/sitemap.xml` | After approval, add `robots: { index: false, follow: false, nocache: true }` to the route metadata and remove `/beta` from the sitemap. Decide separately whether the route should require sign-in or an environment guard. | Prevents low-value diagnostic discovery and reduces operational-information exposure. | If beta acquisition is intentional, retain the page but replace diagnostic output with a safe launch page; rollback is restoring the current sitemap entry and metadata. |
| High | The sitemap contains 11 URLs, principally product, support, and legal pages. It has no intent-specific educational assets for non-branded discovery. | Entire public site | Approve only the first 3-4 original guides/tools in the opportunity map; publish each with product screenshots or real examples, named reviewer/author, sources, and a relevant sign-up CTA. | Builds eligibility for informational, answer, and citation queries without low-value page proliferation. | Publishing unverified or generic content would weaken trust; gate each asset with an evidence review and do not index incomplete drafts. |
| High | Structured data is emitted only on the homepage. Existing schema has no published evidence/case-study content to support citation-worthy claims. | `/` and future editorial pages | Keep the existing valid JSON-LD. Add page-specific `SoftwareApplication`/`WebApplication` only where user-visible pricing and functionality match, and `Article`/`FAQPage` only where the matching visible content exists. Validate every deployment in Schema Markup Validator and Rich Results Test. | Clearer machine-readable entity/page context; no guarantee of rich results or AI citations. | Incorrect offer, review, FAQ, or feature data is deceptive. Roll back the new page-specific block if validation or factual review fails. |
| Medium | `src/app/sitemap.ts` sets every `lastModified` value to `new Date()` on request. The live sitemap therefore presents the same current timestamp for every URL, rather than the actual page update time. | `/sitemap.xml` | After approval, use verified per-route content/release dates (or omit `lastModified` until such dates exist). Do not invent dates. | Reduces misleading change signals and makes future recrawling hints more credible. | Stale timestamps can delay discovery; rollback is omission, not fabricated freshness. |
| Medium | The global `WebApplication` schema advertises a USD 0 offer. The pricing page says “preview”; no commercial source of truth was supplied. | `/` | Product/finance owner must confirm that `price: "0"`, currency, availability, and pricing URL accurately describe the live offer. If not, revise schema and visible pricing together. | Avoids mismatched structured data and inaccurate AI/search answers. | Pricing is commercial information; no change without owner approval. Rollback to the currently verified visible-price state. |
| Medium | Public pages are server-rendered with unique title, description, canonical and H1 elements; this is a strength. Several titles and headings, especially `/docs`, describe the site rather than a concrete user task. | `/docs`, `/projects`, `/community`, `/portfolio` | Test one intent-led title/H1 revision per priority page after an approved content brief, preserving the page’s actual scope. | Better relevance and clearer AI extractability. | Metadata-only edits can reduce branded clarity; measure 28 days and revert the specific revision if CTR/qualified sign-ups decline. |
| Low | English is correctly declared in the document. There is no need to add `hreflang` for a single English version. | All public pages | Do not add hreflang until materially distinct language/region pages exist and reciprocal annotations can be maintained. | Avoids false international targeting. | None; future localization requires a complete localization QA pass. |
| Needs data | No Search Console/Bing/analytics data was available, and a public PSI lab run was unavailable because of API quota. CWV, indexing coverage, rendering, crawl errors, query cannibalization, conversion rate, and AI visibility cannot be verified from this audit. | All | Grant read-only access and capture a 28-day baseline before prioritizing changes beyond the security/discovery fix. | Replaces hypotheses with URL/query/conversion evidence. | Read-only access only; retain no user-level or uploaded-design data. |

### Passed checks

- `https://iroguide.com/` returns a `308` to `https://www.iroguide.com/`.
- `http://www.iroguide.com/` returns a `308` to HTTPS `www`; public sitemap URLs returned `200` after redirect following.
- `robots.txt` allows public crawling, disallows `/api/`, `/admin`, `/auth/`, `/dashboard`, `/profile`, and `/review/new`, and points to the XML sitemap.
- The homepage and the ten other sitemap URLs expose self-canonical URLs and `index, follow` metadata; the sitemap is well-formed.
- The homepage headers include HTTPS, HSTS, CSP, `nosniff`, clickjacking protection, and a restrictive permissions policy. These protections should be preserved during any SEO work.

## C. Keyword/topic-to-URL map

Scoring uses the supplied formula on a 1-5 scale: **opportunity = business value × intent fit × achievable visibility × conversion potential** (maximum 625). “Achievable visibility” is deliberately conservative without first-party search data.

| Priority | Cluster and intent | Recommended target URL | Supporting terms / useful questions | Funnel | Cannibalization and evidence requirement | Score |
|---|---|---|---|---|---|---|
| 1 | AI design critique / obtain actionable feedback | `/` (refresh, do not create duplicate) | AI design feedback, visual design critique, design review tool; “What should I include for a useful critique?” | Commercial investigation | Keep product promise, workflow, privacy, and supported input types only on home. Capture a real reviewed example and product screenshot. | 400 |
| 2 | How to critique a design constructively | `/guides/how-to-critique-a-design` | design critique framework, constructive design feedback, critique questions | Informational | Distinct from tool purchase intent. Needs a practitioner-reviewed framework, worked example, and sources. | 375 |
| 3 | Design feedback checklist | `/guides/design-feedback-checklist` | visual hierarchy checklist, typography feedback, layout critique | Informational / activation | Do not overlap the critique framework; make this a downloadable/interactive checklist with explicit limitations. | 360 |
| 4 | Portfolio review checklist for designers | `/guides/portfolio-review-checklist` | UX portfolio review, design portfolio feedback, case study checklist | Informational / commercial | Keep general career advice and IroGuide workflow clearly separated. Needs a hiring-manager or experienced portfolio-reviewer contribution. | 360 |
| 5 | Turn design critique into a portfolio case study | `/guides/design-critique-to-case-study` | portfolio case study structure, before and after design story | Activation / commercial | Expand the existing `/portfolio` workflow rather than create a competing portfolio product page. Needs a permissioned example. | 320 |
| 6 | UI design critique checklist | `/guides/ui-design-critique-checklist` | UI hierarchy, interface feedback, UX review questions | Informational | Do not claim WCAG conformance or automated accessibility testing. Needs an annotated UI example reviewed by a qualified practitioner. | 300 |
| 7 | Logo critique checklist | `/guides/logo-critique-checklist` | logo feedback, brand mark review, logo design critique | Informational | Only create after confirming the product genuinely supports logo review. Needs before/after or rubric example. | 270 |
| 8 | Poster design critique / poster feedback | `/guides/poster-design-critique` | poster hierarchy, readability, visual communication feedback | Informational | Same rule as logo: an original example must establish distinct value. | 240 |
| 9 | AI portfolio review tool | `/portfolio` (refresh) | portfolio feedback tool, case study feedback, portfolio improvement | Commercial investigation | Limit scope to the actual product: private critique history and case-study workflow, not URL crawling or job-match analysis. Needs product evidence. | 240 |
| 10 | Private AI design feedback | `/privacy` plus a short proof section on `/` | private design critique, design-upload privacy, AI design review privacy | Trust / commercial | Never use legal certainty language. Link from product page to counsel-reviewed privacy policy and explain user controls. | 225 |

Current SERPs show a crowded commercial space with Figma product pages and dedicated AI critique/portfolio tools. The realistic differentiation is not “better AI” as an unsubstantiated claim; it is verifiable context-first critique, prioritization, privacy defaults, and the path from feedback to improvement story. Validate exact language and page scope against current SERPs immediately before a publish decision.

## D. Content briefs for the top 10 opportunities

1. **Homepage — AI design critique**  
   Direct answer: “IroGuide helps you turn a design upload and its context into a structured critique with practical next steps.”  
   Metadata: retain `/`; proposed title `AI Design Critique for Clearer Next Steps | IroGuide`; H1 `Get structured feedback on your design.`; description must state the confirmed input, privacy, and sign-up facts.  
   Outline: what it does; who it helps; how to prepare a review; what the critique covers; privacy controls; one authentic example; FAQ; sign-up. Add links to the critique framework, checklist, privacy, and portfolio workflow. Eligible schema: existing WebApplication/FAQ only if visible copy remains identical. Proof: real product capture, exact supported formats, and a consented sample. CTA: “Start a private critique.”

2. **How to critique a design**  
   Direct answer: “A useful design critique connects a specific observation to the work’s goal, audience, and a practical next step.”  
   Metadata: `/guides/how-to-critique-a-design`; title `How to Critique a Design Constructively: A Practical Framework`; H1 `How to give a useful design critique.`  
   Outline: preparation; four-part observation framework; example critique; questions by design goal; how to receive feedback; where AI can help and where judgment remains human. Proof: named practitioner review, worked annotated example, cited design-education sources. Links: checklist, UI, logo, poster guides, IroGuide. Schema: Article. CTA: use the framework in a private critique.

3. **Design feedback checklist**  
   Direct answer: “Check whether the design’s goal, audience, hierarchy, readability, and next action are clear before offering feedback.”  
   Metadata: `/guides/design-feedback-checklist`; title `Design Feedback Checklist: Give Specific, Useful Critique`; H1 `A design feedback checklist for clearer critique.`  
   Outline: 5-minute checklist; why each check matters; printable version; example; limits. Proof: tested checklist from real critique sessions, not a generic list. Links: framework and category guides. Schema: Article/FAQ only for visible questions. CTA: start a review.

4. **Portfolio review checklist**  
   Direct answer: “A strong portfolio review checks whether each case study makes the problem, decisions, evidence, and outcome understandable.”  
   Metadata: `/guides/portfolio-review-checklist`; title `Portfolio Review Checklist for Designers and Case Studies`; H1 `Review a design portfolio with more than first impressions.`  
   Outline: portfolio-level scan; case-study review; reviewer questions; applicant self-review; common evidence gaps. Proof: contribution/review by a hiring design leader; no hiring-outcome claims. Links: portfolio workflow and case-study guide. CTA: refine a selected project privately.

5. **Critique to case study**  
   Direct answer: “Convert critique into a case study by documenting the context, the change you made, why you made it, and what you learned.”  
   Metadata: `/guides/design-critique-to-case-study`; title `Turn Design Critique Into a Stronger Portfolio Case Study`; H1 `From feedback to a credible design story.`  
   Outline: select a critique; name the constraint; show the decision; explain trade-offs; protect confidential work; template. Proof: a permissioned, redacted before/after example. Links: portfolio, privacy, portfolio checklist. CTA: create a private critique.

6. **UI design critique checklist**  
   Direct answer: “Start a UI critique with task clarity, hierarchy, state feedback, readability, and consistency—not personal taste.”  
   Metadata: `/guides/ui-design-critique-checklist`; title `UI Design Critique Checklist for Clearer Interfaces`; H1 `A practical checklist for critiquing UI design.`  
   Outline: task and audience; hierarchy; interaction states; responsive considerations; accessibility caveat; annotated example. Proof: expert reviewer and representative UI screenshot. Links: general checklist and feedback framework. Do not claim compliance testing. CTA: review a UI screen.

7. **Logo critique checklist**  
   Direct answer: “Review a logo against recognition, legibility, reproduction, brand fit, and use in context.”  
   Metadata: `/guides/logo-critique-checklist`; title `Logo Critique Checklist: Evaluate a Mark in Context`; H1 `How to give useful feedback on a logo.`  
   Outline: brief; mark-only vs in-context assessment; reproduction tests; feedback wording; annotated original example. Proof: brand-designer review and permissioned assets. Links: general framework. CTA: review a logo. Publish only after product confirmation.

8. **Poster critique**  
   Direct answer: “A poster critique should test whether a viewer can understand the main message, hierarchy, and next action at a glance.”  
   Metadata: `/guides/poster-design-critique`; title `Poster Design Critique: Check Message, Hierarchy, and Readability`; H1 `How to critique a poster design.`  
   Outline: viewing context; message hierarchy; type; image; contrast; distance test; original example. Proof: designer contribution and own/redacted artefact. Links: general checklist. CTA: review a poster. Publish only after product confirmation.

9. **Portfolio product page**  
   Direct answer: “IroGuide helps you use private critique history to identify decisions and turn selected work into a clearer portfolio story.”  
   Metadata: retain `/portfolio`; proposed title `Portfolio Feedback Workflow: Turn Critique Into Case Studies | IroGuide`; H1 `Turn critique into a portfolio story.`  
   Outline: workflow; what stays private; what users choose to publish; example output; limits; sign-up. Proof: exact feature capture and privacy behavior. Links: case-study guide and privacy. Schema: WebApplication only if it describes visible functionality. CTA: start a private critique.

10. **Private AI design feedback**  
    Direct answer: “IroGuide keeps critiques private by default; any sharing is a separate user action.”  
    Metadata: retain `/privacy`; title `Private AI Design Feedback: How IroGuide Handles Your Work`; H1 `Your design work stays under your control.`  
    Outline: direct answer; data flow; configured AI provider; account deletion; sharing controls; security limits; contact. Proof: engineering review plus legal/counsel approval. Links: homepage and review start. No FAQ schema unless every answer is visible and counsel approved. CTA: read privacy details/start a critique.

Every guide should name an author or reviewer, show its last verified update date, cite original/reputable sources where relevant, and disclose material AI drafting assistance. Do not reuse generic text across guides.

## E. Sustainable authority plan

1. **Original evidence:** publish one quarterly, anonymized and consented study of recurring critique patterns only after a privacy review, minimum sample-quality definition, and methodology page. Never expose uploaded designs, prompts, account data, or private review text.
2. **Useful small tools:** publish one downloadable critique template/checklist that users can apply without signing up. A tool must solve the corresponding page’s problem without a forced gate.
3. **Expert contributions:** commission or invite designers, educators, and hiring managers to review guides and contribute examples; disclose the relationship and their relevant expertise.
4. **Customer stories:** collect explicit written permission, show the initial context, decision, and outcome, and avoid unverified performance claims. A private-before/public-after format can protect client confidentiality.
5. **Editorial outreach:** pitch original findings or expert explainers to design education, portfolio, and creative-process publications. Offer an original data point or useful template, not a link exchange, payment, or manipulated mention.
6. **Entity consistency:** maintain the same approved product description, canonical name, support address, logo, social profiles, and schema facts on the site and legitimate profiles. Add `sameAs` only for official profiles.

## F. Approval-ready implementation backlog

| Window | Owner | Effort | Dependencies | Exact proposed change | KPI / timeframe | Verification |
|---|---|---:|---|---|---|---|
| 0-2 weeks | Engineering + security owner | S | Explicit approval and decision on beta access | Add `noindex, nofollow, nocache` metadata to `/beta`; remove it from `src/app/sitemap.ts`; assess sign-in/environment protection separately. | `/beta` removed from sitemap at next deploy; deindex request only if already indexed. | Curl metadata and sitemap; authenticated product/security smoke test; URL Inspection after deployment. |
| 0-2 weeks | Product owner + engineering | S | Confirm live pricing | Verify or correct the homepage WebApplication offer’s price, currency, availability, and linked pricing page so visible copy and JSON-LD match. | Zero schema mismatches after release. | Schema Markup Validator; Rich Results Test; manual page comparison. |
| 0-2 weeks | Growth + analytics owner | M | Read-only GSC, Bing, GA4, and consent configuration access | Create a baseline sheet/dashboard: index status, 28-day query/page data, sign-up events, and consented organic conversion. | Baseline ready within 7 days. | Compare dashboard totals with source tools; test sign-up event without collecting design content. |
| 0-2 weeks | Content lead + designer | M | Permissioned product screenshots and factual review | Refresh homepage copy around the confirmed value proposition and add one real, privacy-safe critique walkthrough. | Homepage sign-up CTR and engaged sessions; review at 28 days. | Content/legal/privacy sign-off; mobile and desktop QA; analytics event test. |
| 2-8 weeks | Content lead + expert reviewer | M each | Named reviewer, source list, original example | Publish the critique framework, general checklist, portfolio checklist, and critique-to-case-study guide (in that order), only after editorial QA. | Indexed pages and non-branded impressions; review at 28/56 days. | Validate metadata, canonicals, Article schema, internal links, mobile rendering, and source citations. |
| 2-8 weeks | Engineering + content | S | Verified release/content dates | Replace sitemap’s generated `lastModified` timestamp with verified per-route dates or omit it. | Accurate sitemap dates on every release. | Fetch sitemap before/after deployment; compare to source content dates. |
| 2-8 weeks | Product + content | M | Product capability confirmation | Refresh `/portfolio` to clarify its actual workflow and privacy controls; link it with the case-study guide. | Portfolio-page sign-up CTR; assisted conversions at 56 days. | Product acceptance test, content review, schema validation, event checks. |
| 2-8 weeks | Engineering + SEO | S | Approved editorial templates | Implement a reusable guide metadata/template pattern with author/reviewer, visible date, canonical, OG image, and optional truthful Article schema. | 100% of published guides pass technical checklist. | Build, render, structured-data tests, and manual view-source check. |
| 2-6 months | Research + privacy/legal + content | L | Consent model, methodology, original data, review | Publish a methodology-backed original critique-pattern study and one free tool/template. | Earned referring domains, citations, qualified sign-ups; evaluate quarterly. | Privacy review, methodology QA, crawl/schema validation, referral review. |
| 2-6 months | Partnerships/content | M | Completed original assets | Run selective outreach to relevant design education and editorial outlets; document every outreach and response. | Quality editorial mentions/referrals, not raw link count. | Review referring domain relevance and referral conversions; stop campaigns without user/business value. |

## G. KPI dashboard definition

| Area | Weekly measures | Source | Guardrail / analysis rule |
|---|---|---|---|
| Indexing and crawl | submitted/indexed URLs, excluded URLs, crawl errors, sitemap fetch state, canonical-selected URL | GSC + Bing Webmaster Tools | Segment public marketing/guide pages from authenticated/private routes. |
| Search demand | impressions, clicks, CTR, average position by query cluster and landing page | GSC + Bing | Compare brand vs non-brand; annotate releases and SERP changes. |
| Organic conversion | organic sign-ups, conversion rate, assisted sign-ups, landing-page-to-sign-up flow | Consent-aware GA4/product analytics | Never send uploaded designs, critique text, prompts, email, or user IDs as analytics dimensions. |
| Experience | LCP, INP, CLS, mobile CWV pass rate, JS/render errors | Search Console CWV, CrUX, Vercel/RUM | Break down by page template/device; preserve privacy and CSP. |
| Content quality | indexed guide count, guide engagement, scroll/use of template, internal-link journeys | Analytics + editorial QA | Do not use page count as a success metric; prune/merge low-value assets. |
| AI/search citations | monitored prompts, citations/mentions, cited landing URL, answer accuracy, Bing AI Performance where available | Manual prompt log + Bing | Treat as directional; archive prompt/date/source and correct inaccurate entity facts promptly. |

Every 28 days, compare against the baseline, attribute changes to URL/query intent/technical and content changes/seasonality/SERP shifts, and select one highest-leverage experiment. Stop, merge, or improve any page with no demonstrated user or business value.

## H. Risks, approvals, and human expertise required

- **Required approval before any deployment:** all metadata, sitemap, robots, schema, content, analytics, and access-control changes in the backlog.
- **Security/privacy review:** `/beta` access, all diagnostic output, any public screenshot, customer story, study, analytics property, and link between critiques and portfolio content. Private critiques must not be exposed or indexed.
- **Legal review:** privacy-policy claims, terms, provider disclosures, deletion claims, and any pricing/offer changes.
- **Product-owner confirmation:** exact supported design inputs, review dimensions, pricing/availability, share/publish behavior, and feature roadmap language.
- **Editorial/expert review:** critique frameworks, UI/accessibility commentary, portfolio/hiring advice, and original studies. Avoid presenting generic AI drafting as professional judgment.
- **Access still needed for a quantified plan:** read-only GSC, Bing Webmaster Tools, GA4 or equivalent conversion data, confirmed analytics consent mode, top customer segments/jobs-to-be-done, pricing model, and any approved customer proof.

### Source and verification notes

- Live HTTP, page metadata, robots, sitemap, and redirects were fetched on 2026-08-08.
- Current SERP sampling confirms both an incumbent platform and specialist products target AI design feedback and portfolio-review intent. This supports the differentiation recommendation but is not a claim about their market share or IroGuide’s rank.
- Technical guidance should be validated against current Google Search Essentials, structured-data documentation, and the product’s approved facts immediately before implementation.
