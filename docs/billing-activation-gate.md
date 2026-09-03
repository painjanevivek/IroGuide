# Billing Activation Gate

**Current decision:** `GATE-BILLING-01 = CLOSED`
**Current product:** free guided learning
**Checkout/subscriptions/webhooks:** absent

## Preconditions before selecting or installing a provider

- `GATE-PROVIDER-01 = GO`, `GATE-RETENTION-01 = INVEST`, and production-like unit economics cover provider cost, retries, fallback, support, refunds, disputes, taxes, and margin variance.
- Product/business owners approve plans, prices, currency, quota, target regions, trials, discounts, grace, cancellation, refund, and dispute policy.
- Qualified legal/tax/privacy owners approve merchant entity, terms, privacy notices, processor/subprocessor terms, data locations, sales tax/VAT/GST handling, invoices, retention, deletion, and regional restrictions.
- Named billing engineering and support primary/backup owners accept response windows, reconciliation, refund/dispute tooling, on-call routing, and rollback duties.
- A provider-specific ADR and threat model is reviewed before its SDK or API becomes a dependency.

## Required server boundary after approval

- Authenticated same-origin routes create checkout and portal sessions; client plan labels, redirects, or local state never grant entitlement.
- Webhooks use the raw bounded body, provider timestamp tolerance, signature verification before parsing, replay-safe immutable event IDs, processing leases, retry classification, and out-of-order lifecycle reconciliation.
- Entitlements are server-derived from verified internal subscription state and are always intersected with product, provider, privacy, Community, account-lock, quota, and kill-switch state.
- Usage uses atomic reserve, commit, release, expiry, refund, dispute, and repair records. Unknown provider cost reserves the approved maximum.
- No card data, full webhook body, payment secret, invoice content, email, or raw account ID enters application logs or product analytics.

## Lifecycle and recovery contract

Test new, trial, active, renewal, grace, past-due, canceled, expired, refunded, disputed, and account-deleted states; duplicate, delayed, reordered, invalid, and missing webhooks; provider and application outages; checkout abandonment; portal errors; currency/tax display; invoices; export; deletion; and subscription recovery.

Reconciliation compares provider subscriptions/events to internal subscription, entitlement, and usage records from a checkpoint. Repairs are idempotent and audited. Alerts cover webhook age, signature failures, replay, entitlement divergence, duplicate ledger entries, reservation age, refund/dispute failure, and provider-cost/charged-usage mismatch.

## Rollback order

1. Block new checkout and new paid usage.
2. Keep owned history, export, cancellation, deletion, and refund/support paths available.
3. Turn the provider kill switch on; payment state cannot turn it off.
4. Drain or terminalize queued work and release/reconcile reservations.
5. Reconcile unsettled charges, refunds, disputes, and entitlements.
6. Restore the free profile through an exact-SHA release and communicate affected periods.

## Current enforcement

`npm run billing:gate` fails if a known billing SDK, billing/checkout/subscription/webhook API route, or purchase-shaped Pricing control appears. Pricing remains `noindex`, research-only, and links to the available free example critique.
