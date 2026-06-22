# DinoDesign UX Blueprint

Status: Implementation baseline  
Phase: 2 — UX planning and user-flow design

## Experience principles

- Keep one primary decision per step.
- Preserve uploaded work and brief text through recoverable failures.
- Explain why context improves critique before asking for it.
- Show progress without pretending AI timing is exact.
- Make the first recommended action obvious on every review.
- Keep advanced controls discoverable but out of the beginner's main path.

## Information architecture

### Public

- `/` — value, proof, category coverage, mode comparison, example critique, FAQ.
- `/pricing` — plan comparison and usage limits.
- `/sign-in` — email and provider entry points.
- `/privacy` and `/terms` — upload ownership, retention, AI processing, deletion.

### Product

- `/review/new` — upload, category, brief, mode, confirmation.
- `/review/[id]` — critique, checklist, follow-up, improvement actions.
- `/dashboard` — recent work, aggregate progress, next lesson.
- `/history` — searchable review archive.
- `/settings` — profile, privacy, data export, account deletion.

Community, portfolio, and team routes remain outside MVP navigation until their phases are active.

## Primary journey

1. **Understand:** the landing page demonstrates the what/why/how review structure.
2. **Start:** “Review my design” opens the review workspace; sign-in is requested only when persistence is needed.
3. **Upload:** drag, paste, or browse for one supported image.
4. **Describe:** choose category and provide audience, purpose, style, and goal.
5. **Tune:** select Beginner, Mentor, or Direct feedback.
6. **Confirm:** verify thumbnail, category, mode, privacy statement, and editable brief summary.
7. **Analyze:** show ordered, truthful processing stages with an accessible live status.
8. **Review:** lead with summary, score, strengths, and the first high-priority fix.
9. **Act:** complete checklist items, ask a contextual question, or generate an improvement prompt.
10. **Return:** save the review and surface it in history and dashboard progress.

## New-review flow

The flow is one responsive workspace with four visible steps rather than four page navigations. Desktop uses a sticky preview beside the form; mobile stacks preview above the active step.

### Step 1 — Upload

- Accept JPEG, PNG, and WebP up to 10 MB for MVP.
- Validate MIME signature and decoded image, not extension alone.
- Show accepted formats, limit, privacy status, and keyboard-operable browse action.
- After selection, show thumbnail, filename, dimensions, size, replace, and remove.
- Never upload until the user continues and accepts processing.

### Step 2 — Context

- Display category cards with icon, title, and one-sentence scope.
- Require target audience, purpose, style, and goal.
- Place industry, platform, concern, and inspiration inside an “Add useful context” disclosure.
- Use inline validation after blur and a short summary at submit.

### Step 3 — Feedback mode

- Use three radio cards, not ambiguous buttons.
- Label the modes Friendly, Mentor, and Direct in product UI.
- Include a two-line sample so tone differences are concrete.
- Default to Mentor while keeping the choice reversible.

### Step 4 — Confirm

- Summarize input without hiding editable values.
- State that uploads remain private and can be deleted.
- Disable submission while invalid or already submitting.
- Keep the local draft if the request fails.

## Analysis states

Use status text paired with subtle motion:

1. Securing upload
2. Reading composition
3. Comparing brief and audience
4. Building recommendations
5. Checking review consistency

These are qualitative stages; no fabricated percentage is shown. A long-running state appears after 25 seconds, and an actionable retry appears after a bounded timeout.

## Review result hierarchy

### Desktop

- Sticky left rail: submitted design, brief, category, mode, privacy actions.
- Main column: score and summary, strengths, priority banner, category score grid, issue cards, checklist, follow-up mentor.

### Mobile

- Collapsible design preview and brief.
- Summary and first priority remain above the fold.
- Category scores become a horizontal snap list.
- Issues use readable stacked sections rather than nested tabs.

Each issue card follows the same scan order: category and priority, observed issue, why it matters, recommended change, specific actions.

## Follow-up conversation

- Suggested questions are real buttons and populate/send only on explicit action.
- The composer states that replies use the current review and brief.
- Responses cite the relevant issue/category in plain language.
- Network failure preserves draft text and exposes retry.
- Conversation is attached to one review and never leaks into another.

## History and dashboard

### Empty state

Explain the value of a first review and link directly to `/review/new`; do not show fake charts.

### Populated state

- Recent-review cards show thumbnail, category, score, mode, date, and highest-priority open issue.
- Dashboard shows total reviews, average score, score trend, recurring weakness, strongest area, and suggested practice.
- History supports search, category/mode filters, sort, open, favorite, and delete.
- Delete requires confirmation, explains impact, and supports failure recovery.

## Failure and edge states

| Situation | User-facing behavior | Recovery |
| --- | --- | --- |
| Unsupported or corrupt image | Explain accepted formats and identify the failed file | Replace without clearing the brief |
| Oversized image | Show current and maximum size | Replace or compress externally |
| Upload interrupted | Mark upload as incomplete | Retry from retained local file |
| Review service unavailable | Explain that the design was not lost | Retry with the saved upload and brief |
| Invalid AI response | Do not render partial or contradictory critique | Re-run consistency-checked generation |
| Unauthorized session | Explain expiration without blaming the user | Sign in, then resume draft |
| No useful visual detail | Ask for a clearer export and explain why | Replace image or continue with caveat |
| Empty history | Provide a guided first action | Start a new review |

## Accessibility and responsive acceptance criteria

- All actions work with keyboard only, with visible focus and logical tab order.
- Form controls have persistent labels, descriptions, and error associations.
- Live upload and analysis updates use a polite status region.
- Color never carries priority or score meaning alone.
- Text and interactive contrast meet WCAG AA; touch targets are at least 44 × 44 px.
- Motion respects `prefers-reduced-motion`.
- Content remains usable from 320 px through wide desktop without horizontal page scroll.
- Long critique content uses readable line length and meaningful headings.

## UX acceptance path

A first-time user on mobile must be able to understand the value, select a valid image, complete the minimum brief, choose a mode, survive a simulated review failure without data loss, read the highest-priority correction, and ask a follow-up using only keyboard-equivalent controls.

