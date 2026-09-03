import { z } from "zod";

const eventIdSchema = z.uuid();
const boundedCountSchema = z.number().int().min(0).max(10_000);
const cohortSignatureSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const productEvidenceEventSchema = z.discriminatedUnion("name", [
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("landing_viewed"),
    source: z.enum(["direct", "search", "referral", "unknown"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("sample_started"),
    sampleId: z.enum(["form-together-friendly", "fieldnote-mentor", "signal-noise-direct"]),
    sampleVersion: z.literal("v1"),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("onboarding_started"),
    source: z.enum(["auth", "dashboard", "profile"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("brief_started"),
    category: z.enum(["logo", "poster", "social", "ui", "website", "book-cover", "packaging", "other"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("onboarding_completed"),
    cohort: z.enum(["beginner-designer", "freelancer", "ui-ux-designer", "other"]),
    categoryCount: z.number().int().min(0).max(5),
    mode: z.enum(["friendly", "mentor", "direct"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("workspace_returned"),
    ageBucket: z.enum(["same-day", "1-7-days", "8-30-days", "31-plus-days", "unknown"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("onboarding_skipped"),
    atStep: z.number().int().min(1).max(3),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("sample_finding_revealed"),
    sampleId: z.enum(["form-together-friendly", "fieldnote-mentor", "signal-noise-direct"]),
    findingIndex: z.number().int().min(0).max(2),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("sample_completed"),
    sampleId: z.enum(["form-together-friendly", "fieldnote-mentor", "signal-noise-direct"]),
    sampleVersion: z.literal("v1"),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("self_review_started"),
    category: z.enum(["logo", "poster", "social", "ui", "website", "book-cover", "packaging", "other"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("self_review_completed"),
    category: z.enum(["logo", "poster", "social", "ui", "website", "book-cover", "packaging", "other"]),
    priorityCount: z.number().int().min(0).max(3),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("brief_ready"),
    category: z.enum(["logo", "poster", "social", "ui", "website", "book-cover", "packaging", "other"]),
    constraintPresent: z.boolean(),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("access_interest_recorded"),
    category: z.enum(["logo", "poster", "social", "ui", "website", "book-cover", "packaging", "other"]),
    cohort: z.enum(["beginner-designer", "freelancer", "ui-ux-designer", "other"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("access_interest_revoked"),
    previousStatus: z.enum(["interested", "invited", "declined", "expired", "revoked", "none"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("sign_up_completed"),
    method: z.literal("email"),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("sign_in_completed"),
    method: z.enum(["email", "google"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("documentation_opened"),
    section: z.enum(["overview", "quick-start", "learning-paths", "core-concepts", "advanced-practice"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("review_availability_opened"),
    source: z.enum(["dashboard", "docs", "navigation", "portfolio", "review-route"]),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("review_data_deleted"),
    scope: z.literal("reviews"),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("review_history_opened"),
    eligibleCount: boundedCountSchema,
    excludedCount: boundedCountSchema,
  }),
  z.strictObject({
    cohortSignature: cohortSignatureSchema,
    eventId: eventIdSchema,
    name: z.literal("progress_baseline_seen"),
    sampleCount: z.literal(1),
  }),
  z.strictObject({
    cohortSignature: cohortSignatureSchema,
    eventId: eventIdSchema,
    name: z.literal("progress_comparable_seen"),
    recurringIssueCount: boundedCountSchema,
    sampleCount: z.number().int().min(2).max(10_000),
  }),
  z.strictObject({
    ageBucket: z.enum(["same-day", "1-7-days", "8-30-days", "31-plus-days", "unknown"]),
    eventId: eventIdSchema,
    name: z.literal("review_detail_reopened"),
    trustState: z.enum(["server-verified", "local-unverified", "legacy-unverified"]),
  }),
  z.strictObject({
    comparisonPresent: z.boolean(),
    eventId: eventIdSchema,
    name: z.literal("case_study_draft_prepared"),
    sourceCount: z.number().int().min(1).max(100),
  }),
  z.strictObject({
    eventId: eventIdSchema,
    name: z.literal("case_study_blocked_unverified"),
    reason: z.enum(["no-account", "no-review", "unverified-review", "reviews-unavailable"]),
  }),
]);

export const researchFeedbackSchema = z.strictObject({
  clarity: z.enum(["clear", "partly-clear", "unclear"]),
  cohort: z.enum(["beginner-designer", "freelancer", "ui-ux-designer"]),
  nextStep: z.enum(["read-docs", "return-later", "check-review-availability", "prepare-case-study"]),
  researchConsent: z.literal(true),
});

export type ProductEvidenceEvent = z.infer<typeof productEvidenceEventSchema>;
export type ProductEvidenceEventName = ProductEvidenceEvent["name"];
export type ProductEvidenceEventInput = ProductEvidenceEvent extends infer Event
  ? Event extends { eventId: string }
    ? Omit<Event, "eventId">
    : never
  : never;
export type ResearchFeedback = z.infer<typeof researchFeedbackSchema>;

export type StoredProductEvidenceEvent = ProductEvidenceEvent & {
  accountHash: string;
  consent: "analytics-v1";
  environment: ProductEvidenceEnvironment;
  occurredAt: string;
  retentionExpiresAt: string;
  sampleRate: number;
  schemaVersion: 1;
};

export type StoredResearchFeedback = ResearchFeedback & {
  accountHash: string;
  environment: ProductEvidenceEnvironment;
  submittedAt: string;
};

export type ProductEvidenceEnvironment = "development" | "preview" | "production" | "test";

const reportMetricDefinitions = [
  ["landingActivation", ["landing_viewed", "sample_started"]],
  ["onboardingActivation", ["onboarding_started", "onboarding_completed", "onboarding_skipped"]],
  ["sampleLearning", ["sample_started", "sample_finding_revealed", "sample_completed"]],
  ["selfReviewLearning", ["self_review_started", "self_review_completed"]],
  ["briefReadiness", ["brief_started", "brief_ready"]],
  ["accessInterest", ["access_interest_recorded", "access_interest_revoked"]],
  ["signInCompletion", ["sign_in_completed"]],
  ["dashboardReturn", ["workspace_returned", "review_history_opened"]],
  ["documentationEngagement", ["documentation_opened"]],
  ["reviewAvailabilityInterest", ["review_availability_opened"]],
  ["deletionSuccess", ["review_data_deleted"]],
  ["caseStudyInterest", ["case_study_draft_prepared", "case_study_blocked_unverified"]],
] as const;

export function buildProductEvidenceSummary(
  events: StoredProductEvidenceEvent[],
  feedback: StoredResearchFeedback[],
) {
  const counts = new Map<ProductEvidenceEventName, number>();
  const uniqueAccounts = new Set<string>();

  for (const event of events) {
    counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
    uniqueAccounts.add(event.accountHash);
  }

  return {
    eventCount: events.length,
    uniqueAccountCount: uniqueAccounts.size,
    metrics: Object.fromEntries(reportMetricDefinitions.map(([key, names]) => [
      key,
      {
        observed: names.some((name) => counts.has(name)),
        status: names.some((name) => counts.has(name)) ? "observed" : "not-observed",
        total: names.reduce((total, name) => total + (counts.get(name) ?? 0), 0),
      },
    ])),
    funnels: {
      landingToSample: buildFunnel(events, "landing_viewed", "sample_started"),
      signUpToSample: buildFunnel(events, "sign_up_completed", "sample_started"),
      sampleCompletion: buildFunnel(events, "sample_started", "sample_completed"),
      briefReadiness: buildFunnel(events, "brief_started", "brief_ready"),
      accessInterest: buildFunnel(events, "brief_ready", "access_interest_recorded"),
      accessRevocation: buildFunnel(events, "access_interest_recorded", "access_interest_revoked"),
      sevenDayReturn: buildFunnel(events, "onboarding_completed", "workspace_returned", (event) => event.name === "workspace_returned" && event.ageBucket === "1-7-days"),
    },
    feedback: {
      responseCount: feedback.length,
      researchConsentCount: feedback.filter((response) => response.researchConsent).length,
      byCohort: countBy(feedback, (response) => response.cohort),
      byClarity: countBy(feedback, (response) => response.clarity),
    },
  };
}

function buildFunnel(
  events: StoredProductEvidenceEvent[],
  denominatorName: ProductEvidenceEventName,
  numeratorName: ProductEvidenceEventName,
  numeratorFilter: (event: StoredProductEvidenceEvent) => boolean = (event) => event.name === numeratorName,
) {
  const eligible = new Map<string, number>();
  for (const event of events) {
    if (event.name !== denominatorName) continue;
    const occurredAt = Date.parse(event.occurredAt);
    if (!Number.isFinite(occurredAt)) continue;
    eligible.set(event.accountHash, Math.min(eligible.get(event.accountHash) ?? occurredAt, occurredAt));
  }
  const completed = new Set(events.filter((event) => {
    const eligibleAt = eligible.get(event.accountHash);
    const occurredAt = Date.parse(event.occurredAt);
    return eligibleAt !== undefined && Number.isFinite(occurredAt) && occurredAt >= eligibleAt && numeratorFilter(event);
  }).map((event) => event.accountHash));
  const denominator = eligible.size;
  const numerator = completed.size;
  const status = denominator === 0 ? "not-observed" : denominator < 20 ? "insufficient-sample" : numerator === 0 ? "measured-zero" : "measured";
  return { denominator, numerator, rate: denominator === 0 ? null : numerator / denominator, status };
}

function countBy<T>(items: T[], select: (item: T) => string) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = select(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
