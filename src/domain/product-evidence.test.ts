import { describe, expect, it } from "vitest";
import {
  buildProductEvidenceSummary,
  productEvidenceEventSchema,
  researchFeedbackSchema,
  type StoredProductEvidenceEvent,
} from "./product-evidence";

const eventId = "018f1a80-7b5a-7c61-a9be-2f38de60ec98";

describe("productEvidenceEventSchema", () => {
  it("accepts the minimized retention taxonomy", () => {
    expect(productEvidenceEventSchema.parse({
      eventId,
      name: "review_history_opened",
      eligibleCount: 2,
      excludedCount: 1,
    })).toEqual({ eventId, name: "review_history_opened", eligibleCount: 2, excludedCount: 1 });
  });

  it.each(["email", "userId", "documentId", "reviewText", "imageUrl", "summary"])(
    "rejects sensitive or unapproved field %s",
    (field) => {
      expect(productEvidenceEventSchema.safeParse({
        eventId,
        name: "review_history_opened",
        eligibleCount: 2,
        excludedCount: 1,
        [field]: "private-value",
      }).success).toBe(false);
    },
  );

  it("rejects a non-hashed cohort signature", () => {
    expect(productEvidenceEventSchema.safeParse({
      eventId,
      name: "progress_baseline_seen",
      cohortSignature: "website:provider:rubric",
      sampleCount: 1,
    }).success).toBe(false);
  });
});

describe("researchFeedbackSchema", () => {
  it("accepts categorical research feedback without contact details", () => {
    expect(researchFeedbackSchema.parse({
      clarity: "clear",
      cohort: "freelancer",
      nextStep: "read-docs",
      researchConsent: true,
    })).toBeTruthy();
  });

  it("rejects free text and direct identifiers", () => {
    expect(researchFeedbackSchema.safeParse({
      clarity: "clear",
      cohort: "freelancer",
      nextStep: "read-docs",
      researchConsent: true,
      email: "person@example.com",
      comment: "Here is my private project.",
    }).success).toBe(false);
  });

  it("does not accept a research response without explicit consent", () => {
    expect(researchFeedbackSchema.safeParse({
      clarity: "clear",
      cohort: "freelancer",
      nextStep: "read-docs",
      researchConsent: false,
    }).success).toBe(false);
  });
});

describe("buildProductEvidenceSummary", () => {
  it("returns aggregates without account-level rows", () => {
    const events: StoredProductEvidenceEvent[] = [
      {
        accountHash: "a".repeat(64),
        consent: "analytics-v1",
        environment: "production",
        eventId,
        name: "review_history_opened",
        eligibleCount: 2,
        excludedCount: 0,
        occurredAt: "2026-08-24T00:00:00.000Z",
        retentionExpiresAt: "2026-09-23T00:00:00.000Z",
        sampleRate: 1,
        schemaVersion: 1,
      },
      {
        accountHash: "a".repeat(64),
        consent: "analytics-v1",
        environment: "production",
        eventId: "018f1a80-7b5a-7c61-a9be-2f38de60ec99",
        name: "case_study_draft_prepared",
        sourceCount: 1,
        comparisonPresent: false,
        occurredAt: "2026-08-24T00:01:00.000Z",
        retentionExpiresAt: "2026-09-23T00:01:00.000Z",
        sampleRate: 1,
        schemaVersion: 1,
      },
    ];

    expect(buildProductEvidenceSummary(events, [])).toMatchObject({
      eventCount: 2,
      uniqueAccountCount: 1,
      metrics: {
        dashboardReturn: { observed: true, total: 1 },
        caseStudyInterest: { observed: true, total: 1 },
        signInCompletion: { observed: false, total: 0 },
      },
    });
    expect(buildProductEvidenceSummary(events, []).funnels.landingToSample.status).toBe("not-observed");
  });

  it("distinguishes insufficient samples from a measured zero", () => {
    const small = Array.from({ length: 3 }, (_, index) => storedEvent(index, "sample_started"));
    const measuredZero = Array.from({ length: 20 }, (_, index) => storedEvent(index, "sample_started"));
    expect(buildProductEvidenceSummary(small, []).funnels.sampleCompletion.status).toBe("insufficient-sample");
    expect(buildProductEvidenceSummary(measuredZero, []).funnels.sampleCompletion.status).toBe("measured-zero");
  });

  it("counts a completion only when it follows the account's eligible start", () => {
    const start = storedEvent(1, "sample_started");
    const completion = {
      ...start,
      eventId: "018f1a80-7b5a-7c61-a9be-200000000001",
      name: "sample_completed" as const,
      occurredAt: "2026-08-24T00:01:00.000Z",
    };
    expect(buildProductEvidenceSummary([completion, start], []).funnels.sampleCompletion.numerator).toBe(1);
    expect(buildProductEvidenceSummary([{ ...completion, occurredAt: "2026-08-23T23:59:00.000Z" }, start], []).funnels.sampleCompletion.numerator).toBe(0);
  });
});

function storedEvent(index: number, name: "sample_started"): Extract<StoredProductEvidenceEvent, { name: "sample_started" }> {
  return {
    accountHash: index.toString(16).padStart(64, "0"), consent: "analytics-v1", environment: "production",
    eventId: `018f1a80-7b5a-7c61-a9be-${(100000000000 + index).toString()}`, name,
    sampleId: "form-together-friendly", sampleVersion: "v1", occurredAt: "2026-08-24T00:00:00.000Z",
    retentionExpiresAt: "2026-09-23T00:00:00.000Z", sampleRate: 1, schemaVersion: 1,
  };
}
