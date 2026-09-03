# Free-Launch Cohort Research Kit

- Status: prepared; participant recruitment not yet approved
- Primary cohorts: beginner designers, freelancers, and UI/UX designers
- Product profile: `free`
- Community: closed
- Live critique: unavailable

## Research boundary

The study evaluates whether participants understand the current learning workflow, privacy boundary, saved-history value, and future critique interest. It does not test live AI output, promise access, collect design files, or treat intent as retention. Participation is voluntary and may stop at any time.

The in-product survey accepts only four categorical answers. It does not accept names, emails, project text, creative content, client data, or an open comment. A separately recruited participant may consent to a moderated interview, but the operator must store recruitment contact details outside product evidence and follow the approved research-retention policy.

## Recruitment script

> IroGuide is testing a free design-learning experience for beginner designers, freelancers, and UI/UX designers. Live AI critique is not currently available. We are studying whether the product promise, documentation, privacy controls, and saved-learning workflow are understandable. The session takes about 20 minutes. Please do not share confidential client work or personal data.

Do not recruit minors, claim compensation before it is approved, or imply that participation unlocks features. Record the cohort source and consent state, not an inferred skill level.

## Session consent

Before starting, confirm each statement:

- I understand that live AI critique is unavailable in this study.
- I will not upload or disclose confidential, client-owned, or personally identifying material.
- I understand which notes or recordings, if any, will be retained and for how long.
- I may skip a question or stop the session without penalty.
- I consent to de-identified findings being reported in aggregate.

Recording requires a separate explicit approval. Silence is not consent.

## Moderated session script

1. Ask the participant to describe what they think IroGuide does after viewing the landing page.
2. Ask them to locate the product guide and explain the four-step critique workflow in their own words.
3. Ask what data they believe would be uploaded, stored, or shared in the current free profile.
4. Ask them to create or sign in to a disposable study account only when an approved test identity is available.
5. Ask them to locate the dashboard, review-availability state, private case-study workshop, and deletion controls.
6. Ask what they would expect to happen after selecting “Review availability.”
7. Ask whether they would return, for what job, and what evidence would make a future critique trustworthy.
8. Finish with the bounded research survey. Do not convert interview notes into product events.

## Role-specific task cards

Use the same neutral opening for every participant: “Please use the site as you normally would. Think aloud when comfortable; I will not teach the interface unless the session reaches the assistance checkpoint.” Do not mention the intended route, expected control label, or success condition.

### Beginner designer

1. Decide whether this product can help you practise critique today and explain why.
2. Complete one example critique exercise, then identify the first change you would make to the example.
3. Use the rubric to review a fictional landing-page concept without uploading an image.
4. Prepare enough context that a future reviewer could understand the fictional concept.

### Freelancer

1. Decide whether the current product is safe to use before a client handoff.
2. Complete one example critique and explain which evidence is actionable versus opinion.
3. Self-review a fictional client landing page; mark any irrelevant criterion appropriately.
4. Prepare a brief without entering client names, confidential copy, or source files.

### UI/UX designer

1. Decide whether the product can support a pre-handoff design-quality check today.
2. Complete one example critique and identify the rubric/category relationship.
3. Self-review a fictional product flow and explain any `unsure` or `not applicable` choices.
4. Prepare a future-review brief that distinguishes audience, task, constraint, and concern.

After the first three minutes, assistance may be given only when requested or when the participant has made no progress for 90 seconds. Record assistance as `none`, `clarification`, `navigation`, or `task-completion`; assisted completion is never counted as unassisted success.

## Interview prompts

- Which phrase best explained the product’s value? Which phrase was ambiguous?
- Did the unavailable critique state feel honest or broken? Why?
- Which privacy statement affected your willingness to continue?
- Would saved history, progress, or a private case-study outline create a reason to return?
- What would you need to trust a limited live-provider evaluation?
- For freelancers: would client confidentiality change what you submit?
- For UI/UX designers: which artifact and context fields would be essential?
- For beginner designers: which next action felt concrete enough to practice?

## Evidence template

| Field | Allowed value |
|---|---|
| Session ID | Random research ID; never a Firebase UID |
| Cohort | Beginner designer, freelancer, UI/UX designer |
| Consent | Granted, declined, withdrawn |
| Journey completed | Landing, docs, auth, dashboard, availability, deletion |
| Observed behavior | Factual action or direct short paraphrase |
| Researcher interpretation | Explicitly labelled hypothesis |
| Severity | Blocking, confusing, minor, positive |
| Follow-up | Product copy, accessibility, workflow, privacy, or no action |

Use three physically separated note blocks:

1. `Observation` — timestamped action, route, visible state, assistance, and outcome; no motive is inferred.
2. `Participant input` — a short paraphrase or a permitted quotation linked to explicit consent.
3. `Interpretation` — researcher hypothesis, confidence (`low`, `medium`, `high`), alternative explanation, and proposed validation.

Never merge the blocks during synthesis. A product decision must link back to at least one observation and may not rely on an unattributed interpretation.

Do not paste review text, design content, email addresses, raw account identifiers, or client names into this template.

## Metric dictionary and decision thresholds

| Measure | Numerator | Denominator | Pass threshold |
|---|---|---|---|
| Correct product understanding | Participants who state that examples are educational and their own design was not analysed | Consented sessions reaching the landing task | 100%; any false-analysis belief is blocking |
| Unassisted sample completion | Participants completing prediction, evidence reveal, explanation, and first fix without navigation/task-completion assistance | Sessions starting a sample | At least 70% overall and no cohort below 60% |
| First useful action | Participants producing a first fix that references visible evidence | Sessions completing a sample | At least 70% |
| Brief readiness | Participants reaching a `ready` fictional brief without confidential or personally identifying content | Sessions starting a brief | At least 60% |
| Access interest comprehension | Participants who correctly explain that interest is revocable and is not an invitation | Sessions viewing access interest | At least 90% |
| Seven-day return | Participants returning within 168 hours to continue a learning artifact | Eligible consenting accounts | Report only; do not claim retention below 30 eligible accounts |

Report each measure as `not-observed`, `insufficient-sample`, `measured-zero`, or `measured`. Show numerator, denominator, cohort split, assistance split, device split, research window, and missing-data count. Never pool an unmeasured cohort into a positive aggregate.

## Research operations checklist

- Owner approval names the recruitment source, maximum participant count, compensation, jurisdiction, dates, facilitator, note taker, retention period, and deletion owner.
- Consent is recorded before product use. Recording consent is separate and defaults to off.
- Device class, browser, assistive technology, session mode, facilitation level, known sampling bias, withdrawal, and data-deletion completion are categorical.
- Participant research IDs are random and stored separately from recruitment contact details.
- The facilitator uses a disposable fictional brief and never asks for a real client or employer artifact.
- A withdrawal stops the session and removes notes/recordings within the approved deletion window; aggregate counts are recomputed where feasible.
- A second researcher audits at least 20% of observation-to-interpretation links before a gate decision.

## `GATE-EVIDENCE-01` decision record

The decision owner must choose exactly one outcome:

- `GO` — all blocking thresholds pass, cohort coverage is adequate, and residual usability defects have named owners and deadlines.
- `REVISE` — product understanding remains truthful but one or more activation thresholds miss; publish the bounded revisions and rerun plan.
- `STOP` — any participant believes their design was analysed, consent/withdrawal fails, a serious privacy/accessibility issue occurs, or the evidence cannot support a reliable decision.

Until approved sessions exist, record `GATE-EVIDENCE-01 = CLOSED — not observed`. Prepared scripts and templates are not a substitute for participants, consent, or seven-day return evidence.

## Cohort completion gate

This task remains incomplete until the owner approves a participant cohort and the sessions are actually run. Prepared scripts are implementation evidence; they are not participant or retention evidence.
