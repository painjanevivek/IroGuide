# Data Model: Curiosity-Led Landing Experience

This feature creates no persisted data. It operates on immutable presentation definitions plus transient, client-local selection state.

## `CritiqueBeat`

| Field | Type | Rules | Purpose |
|---|---|---|---|
| `id` | string | Stable, unique; use a semantic label such as `capture`, `focus`, or `refine` | Selection and test identity |
| `label` | string | Short visible control label | Names the insight stage |
| `title` | string | Plain-language, action-oriented | Explains the current example insight |
| `copy` | string | Clearly illustrative; must not claim the visitor's work was analyzed | Gives the observation and rationale |
| `outcome` | string | Concrete next-step benefit | Connects the observation to refinement |
| `visualState` | presentation metadata | Optional coordinates/SVG glyph/class token; never the only expression of meaning | Drives decorative enhancement |

**Invariants**:

- The ordered collection contains at least three beats, covering context/evidence, friction/insight, and a practical improvement.
- `id` values are unique and selection resolves to a valid index.
- Text content alone communicates the full preview; `visualState` is supplementary.
- The collection is authored in source and is not derived from visitor input or review data.

## `PreviewState`

| Field | Type | Rules | Purpose |
|---|---|---|---|
| `activeIndex` | integer | Clamp to `0..critiqueBeats.length - 1` | The single visible illustrative insight |
| `motionMode` | `"enhanced" \| "basic"` | Derived from viewport and `prefers-reduced-motion`; not stored | Allows decoration without changing semantics |

**State transitions**:

1. The server-rendered default exposes the first beat in readable form.
2. A button, keyboard activation, touch selection, or optional scrub interaction requests a beat index.
3. The reducer/selection helper clamps the request and updates `activeIndex` atomically.
4. In enhanced mode GSAP animates the visual transition; in basic mode the new readout is immediate.
5. The review CTA always stays a normal link to `/review/new`, independent of preview state.

## Persistence and privacy

- No Firestore, Storage, API request, cookie, local storage, or account record is added.
- No preview selection is treated as analytics or product-review input by this feature.
- Illustrative copy must remain explicitly labelled as an example, preventing an implication of personalized critique.
