# Landing Experience UI Contract

This feature has no external HTTP contract. Its public contract is the accessible page behaviour below.

## Entry and navigation

| Surface | Required contract |
|---|---|
| `/` | Server-rendered page exposes the IroGuide value statement and a labelled primary review link without requiring animation or preview interaction. |
| Primary review actions | Use normal links to `/review/new`; remain reachable by keyboard and pointer; do not depend on scroll position, a timeline finishing, or a selected preview beat. |
| Preview continuation | Provides a clearly labelled next action to the same existing review entry path after the illustrative content. |

## Illustrative critique preview

| Surface | Required contract |
|---|---|
| Landmark | A labelled section with a heading and an explicit statement that it is an example preview, not the visitor's analysis. |
| Insight controls | Native `button` elements with discernible names and `aria-pressed` (or a documented equivalent single-selection pattern); exactly one selected state at a time. |
| Readout | The active label, title, observation, and outcome are present as text. Update announcements are polite and concise. |
| Optional enhancement | Drag, scroll, SVG, and motion effects may mirror selection but cannot be the only way to inspect an insight. |

## Accessibility and responsive guarantees

| Condition | Required observable behaviour |
|---|---|
| Keyboard-only | Tab order reaches review links and each preview control; focus is visible; activation changes the readout; focus is never trapped. |
| `prefers-reduced-motion: reduce` | Essential content and controls remain visible; non-essential scroll smoothing, looping, and transition choreography are absent or instant. |
| 390 px touch viewport | No document-level horizontal overflow; controls wrap or stack without clipping; links and buttons remain usable. |
| Enhancement failure or fast scroll | The hero, story, preview content, and CTAs remain in their final readable state. |

## Test selectors and assertions

Prefer semantic locators (`getByRole`, `getByLabel`, headings, links) in Playwright. Add stable `data-testid` values only if semantic names cannot distinguish repeated visual elements. Tests must assert the actual `/review/new` link target, selected-state change, reduced-motion fallback, focus navigation, and document overflow constraint.
