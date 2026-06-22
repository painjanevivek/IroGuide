# DinoDesign Product Foundation

Status: Approved baseline for implementation  
Working product name: **DinoDesign**  
Last updated: 2026-06-22

## Vision

DinoDesign is a professional AI design-critique and learning platform. It helps people upload visual work and receive clear, contextual, actionable feedback that feels like guidance from an experienced designer or art director.

It is not an image generator with a score attached. Its primary job is to explain **what** is working or failing, **why** that matters for the intended audience and goal, and **how** to improve the work.

## Value proposition

> Upload any visual design and get professional, honest, actionable critique in minutes—not vague opinions.

### Main user promise

Every completed review should leave the user with:

- A reasoned assessment grounded in their brief.
- A prioritized set of concrete improvements.
- An explanation of the design principles involved.
- A clear next action, even when the submitted work is weak.

### Core outcome

The product should improve both the submitted design and the user's design judgment over time.

## Problem statement

Design feedback is often subjective, vague, delayed, or inaccessible. Comments such as “looks good,” “something feels off,” and “make it more modern” do not identify the failing principle, the audience impact, or a practical repair.

This is especially costly for learners without regular mentor access, freelancers before client delivery, creators working at speed, and business owners reviewing work outside their expertise. DinoDesign turns critique into a structured, repeatable process while keeping the user's purpose and audience central.

## Priority users

| Priority | User | Primary need | Product response |
| --- | --- | --- | --- |
| 1 | Design students | Principle-based critique and portfolio growth | Educational feedback with professional depth |
| 2 | Beginner designers | Clear language and confidence-building direction | Beginner mode and explained recommendations |
| 3 | Freelancers | Fast quality control before delivery | Mentor and direct modes with prioritized fixes |
| 4 | Business owners | Brand and audience-fit validation | Plain-language commercial guidance |
| 5 | Content creators | Platform-aware, attention-focused feedback | Readability, hierarchy, and engagement review |
| 6 | UI/UX designers | Usability and accessibility critique | UI-specific rubric and conversion guidance |

## MVP design categories

- Logo
- Poster
- Social media post
- UI/UX screen
- Website design
- Book cover
- Packaging
- Other visual work

Later releases may add branding systems, presentations, illustrations, multi-screen flows, and advertisement campaigns. Category rules must be data-driven so new rubrics can be added without rewriting the review pipeline.

## Feedback modes

### Beginner

Friendly, patient, and educational. It introduces design terminology in plain language, explains principles, and avoids overwhelming the user. It never hides a material issue behind encouragement.

### Mentor

Balanced, professional, structured, and detailed. This is the default experience. It gives principle-based critique, explains tradeoffs, and recommends practical changes.

### Direct

An art-director-style critique that removes unnecessary praise and clearly identifies what must change. It remains respectful, critiques the work rather than the person, and never uses humiliating or abusive language. “Direct” is the UI label for the plan's “Brutally Honest” mode.

All modes assess the same evidence and use the same scoring rubric. Only tone, explanation depth, and phrasing change.

## Standard review contract

Every successful review contains:

1. Overall summary and explained score.
2. Category scores for composition, typography, color, spacing, hierarchy, readability, creativity, audience fit, accessibility, and category fit.
3. Specific strengths supported by visible evidence.
4. Issues expressed as what is wrong, why it matters, and how to improve it.
5. Specific recommendations and a high, medium, or low priority.
6. A prioritized final checklist.
7. Relevant follow-up question suggestions.
8. Uncertainty language when the image or brief is insufficient.

## MVP scope

### Included

- Account entry flow and protected personal workspace.
- Single-image upload with preview and validation.
- Category selection and design brief.
- Three feedback modes.
- Structured AI review generation.
- Review result presentation.
- Contextual follow-up conversation.
- Basic review history and deletion.
- Responsive, accessible marketing and product UI.

### Explicitly deferred

- Public community and peer critique.
- Advanced portfolios and case-study publishing.
- Multi-image projects and native design-file editing.
- Automated redesigns without explicit user action.
- Team workspaces and paid subscriptions.

## Product principles

- **Evidence before opinion:** feedback must connect to the submitted work and brief.
- **Action over adjectives:** recommendations must be specific enough to execute.
- **Teach while critiquing:** explain the design principle, not only the correction.
- **Honest without hostility:** directness is useful; personal judgment is not.
- **Private by default:** uploads and reviews are never public without explicit consent.
- **User control:** critique comes first; generation and sharing are optional actions.
- **Accessible throughout:** the platform and its advice should consider inclusive design.

## Success signals

- A user can reach a first structured review without assistance.
- Most generated issues contain aligned what, why, how, recommendation, and priority fields.
- Users can identify the first improvement to make within seconds of opening a review.
- Failed uploads and failed reviews recover without losing the user's brief.
- Repeat users show measurable improvement in recurring weak categories.

