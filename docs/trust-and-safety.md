# IroGuide Trust, Safety, and Accessibility Baseline

Status: Phase 12 implementation checklist

## Critique safety

- Critique the submitted work and observable decisions, never the user's talent or worth.
- Direct mode may remove cushioning, but it retains evidence, reasoning, and respectful language.
- Do not infer sensitive traits, intent, culture, authorship, or professional status from an image.
- State uncertainty when the export, brief, or medium is insufficient.
- Never present a demo response as pixel-level analysis.

## Privacy

- Images are previewed locally in the current demo and image bytes are not sent to the demo endpoint.
- Local review history can be deleted from the dashboard.
- Production uploads require private storage, short-lived signed access, ownership checks, retention jobs, and deletion verification.
- Public community and portfolio publishing remain disabled until separate explicit consent and moderation exist.
- Logs must exclude images, signed URLs, briefs, prompts, and full model responses.

## Platform accessibility

- Skip navigation and semantic landmarks are present.
- Forms use persistent labels and text errors; color is never the only state indicator.
- Keyboard focus is visible and touch targets meet the 44 px target.
- Motion is disabled for reduced-motion preferences.
- Responsive layouts remain usable from 320 px through wide desktop.
- A production release requires automated and manual keyboard, screen-reader, zoom, contrast, and mobile audits.

## Reliability

- Request and response payloads are schema validated.
- Review quality checks require observation, impact, recommendation, specific action, priority, and score alignment.
- Unsupported providers fail transparently instead of silently returning demo output.
- Production generation requires deadlines, idempotency, bounded retries, rate limits, and observable failure states.

## Security headers

The application sets a baseline content security policy, frame denial, MIME sniffing protection, strict referrer policy, cross-origin opener isolation, and a restrictive browser permissions policy. Production deployment must verify these headers through its edge/CDN and tighten script policy with nonces if third-party scripts are introduced.
