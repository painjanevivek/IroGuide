# IroGuide Visual System

Status: Implementation specification  
Phase: 3 — UI design and visual system

## Creative direction

**Editorial studio meets analytical instrument.** IroGuide should feel expressive enough to earn a designer's attention and disciplined enough to trust with professional critique.

The visual language combines:

- Deep ink canvases for focus and authority.
- Warm paper surfaces for critique content and long-form readability.
- Electric violet for primary actions and brand recognition.
- Coral for high-priority intervention.
- Acid lime for insight, progress, and moments of positive surprise.
- Oversized editorial headlines balanced by compact analytical labels.
- Grids, annotations, crop marks, and score arcs used sparingly as functional motifs.

Avoid generic purple gradients, glass everywhere, cartoon mascots, noisy neon, or decoration that competes with a user's uploaded design.

## Brand naming

The product name is stored as a single application constant and exposed as plain text in metadata, navigation, and transactional copy. The wordmark may emphasize `Iro` and `Guide` separately, but accessibility labels always read “IroGuide.”

## Color tokens

### Core palette

| Token | Hex | Use |
| --- | --- | --- |
| Ink 950 | `#09090F` | Primary dark background |
| Ink 900 | `#11111A` | Elevated dark surface |
| Ink 800 | `#1B1B27` | Borders and muted panels |
| Paper 50 | `#FFFDF7` | Primary light canvas |
| Paper 100 | `#F6F1E7` | Secondary light surface |
| Graphite 700 | `#3D3C48` | Secondary light-mode text |
| Violet 500 | `#7C5CFF` | Brand and primary action |
| Violet 400 | `#9C86FF` | Dark-mode action hover |
| Coral 500 | `#FF6B57` | High priority and key emphasis |
| Lime 400 | `#C8F45D` | Insight, progress, positive accent |
| Cyan 400 | `#55D9E8` | Informational data and focus detail |
| Amber 400 | `#FFBF47` | Medium priority and warning |
| Rose 500 | `#F04464` | Error and destructive action |
| Green 500 | `#2BB673` | Success confirmation |

### Semantic rules

- Primary interactive elements use violet with white or near-black text according to contrast.
- Coral communicates a high-priority design issue, never a generic decorative flourish.
- Lime communicates progress or an insight, never destructive success theater.
- Score colors are paired with numbers and labels; color never carries meaning alone.
- Uploaded designs sit on neutral checker or paper surfaces so the brand palette does not distort perception.

### Accessible combinations

- Paper text on Ink 950.
- Ink 950 text on Paper 50, Lime 400, and Amber 400.
- White text on Violet 500 only for large/bold text; primary buttons use Ink 950 when necessary to preserve contrast.
- Error body text uses a darkened rose variant on light surfaces and a light rose variant on ink surfaces.

## Typography

- **Display:** Space Grotesk, variable sans-serif. Tight tracking, confident scale, limited to headlines and score moments.
- **Body/UI:** Manrope, variable sans-serif. High legibility for forms and critique content.
- **Data/annotation:** IBM Plex Mono, compact labels, dimensions, timestamps, and score metadata.
- **Fallback:** system sans-serif stack with metric-safe fallbacks.

### Responsive scale

| Role | Size | Line height | Weight |
| --- | --- | --- | --- |
| Display XL | `clamp(3.2rem, 8vw, 7.5rem)` | 0.92 | 620 |
| Display L | `clamp(2.5rem, 5vw, 5rem)` | 0.98 | 620 |
| Heading 1 | `clamp(2rem, 4vw, 3.5rem)` | 1.02 | 620 |
| Heading 2 | `clamp(1.5rem, 2.5vw, 2.25rem)` | 1.08 | 620 |
| Heading 3 | `1.25rem` | 1.25 | 650 |
| Body L | `1.125rem` | 1.65 | 450 |
| Body | `1rem` | 1.6 | 450 |
| Small | `0.875rem` | 1.5 | 520 |
| Label | `0.75rem` | 1.2 | 650, uppercase |

Long critique text is capped near 70 characters per line. Display tracking may be negative; body copy never uses condensed tracking.

## Layout

- Twelve-column desktop grid, eight-column tablet grid, four-column mobile grid.
- Page maximum width: 1440 px; reading maximum: 760 px.
- Outer gutter: `clamp(1rem, 4vw, 4rem)`.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Major marketing sections use generous vertical rhythm and intentional overlap only above tablet widths.
- Product workspaces prioritize stable alignment and avoid ornamental overlap.

## Shape and elevation

- Small control radius: 10 px.
- Card radius: 18 px.
- Hero or media radius: 28 px.
- Pills are reserved for status, tags, and filters—not every button.
- Default border: 1 px low-contrast neutral.
- Focus ring: 3 px cyan/violet ring with 2 px offset.
- Shadows are broad, low-opacity, and paired with borders. Dark surfaces use light edge highlights instead of heavy black shadows.

## Components

### Buttons

- Primary: solid violet, subtle directional icon, decisive label.
- Secondary: transparent surface with visible border.
- Tertiary: text action with underline or arrow movement on hover.
- Destructive: rose only after explicit intent.
- Loading states preserve button width and announce status.

### Cards

- Marketing cards may use offset color blocks and editorial numbering.
- Product cards use calmer surfaces and consistent header/content/action zones.
- Interactive cards receive hover and focus treatment; static cards do not mimic buttons.

### Form fields

- Persistent labels above fields.
- Optionality shown in label, not placeholder.
- Help and error text reserve layout space when practical.
- Inputs use paper surfaces in light workspaces and ink-800 surfaces in dark workspaces.
- Error state includes message and icon, not red border alone.

### Feedback mode cards

- Friendly: lime accent, open-circle motif.
- Mentor: violet accent, grid motif, default badge.
- Direct: coral accent, sharp rule motif.
- All remain one radio group with visible checked state.

### Score display

- Score is numeric and always includes `/10`.
- A circular or linear visual may reinforce the value but never replaces it.
- Category score visualizations use a consistent 0–10 scale.
- Score color is secondary to explanation and is not framed as an objective quality verdict.

### Priority badges

- High: coral, upward urgency marker, text “High priority.”
- Medium: amber, horizontal marker, text “Medium priority.”
- Low: neutral/cyan, downward marker, text “Low priority.”

## Motion

- Use 160–220 ms for direct interactions and 400–700 ms for intentional section reveals.
- Default easing: cubic-bezier(0.22, 1, 0.36, 1).
- Hover motion is limited to 2–4 px shifts, border changes, and restrained icon movement.
- Analysis can use an orbit/grid scan metaphor, never a fake progress percentage.
- Disable nonessential transforms and parallax under `prefers-reduced-motion`.

## Page compositions

### Landing

Asymmetric hero with large promise, compact proof statement, primary CTA, and a layered live critique specimen. Follow with a marquee-like category rail, what/why/how problem contrast, mode triptych, annotated review example, target-user grid, trust statement, and concise FAQ.

### New review

Dark application shell with a bright paper workspace. Sticky design preview and compact step rail on desktop; linear single-column progression on mobile.

### Review result

Let the user's design remain visually primary. Use paper critique cards, strong typographic hierarchy, compact score instruments, and coral only where immediate correction is justified.

### Dashboard

Calmer than the landing page. Combine one prominent next action with review cards, an honest progress visualization, and a single personalized lesson.

## Quality bar

The interface is accepted only when it remains coherent without animation, works in high zoom and reduced motion, clearly distinguishes actions from information, keeps uploaded work color-neutral, and makes the first recommended fix discoverable faster than decorative brand moments.
