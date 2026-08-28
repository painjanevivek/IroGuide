import { describe, expect, it } from "vitest";
import {
  accountExperiencePatchSchema,
  designBriefPutSchema,
  derivePriorityItemIds,
  guestSampleProgressSchema,
  mergeSampleProgress,
  selfReviewDeleteSchema,
  selfReviewCreateSchema,
} from "./product-activation";

describe("product activation contracts", () => {
  it("rejects unknown profile fields and client-supplied ownership", () => {
    expect(() => accountExperiencePatchSchema.parse({
      schemaVersion: 1,
      expectedRevision: 0,
      mutationId: "mutation-1",
      changes: { primaryRole: "freelancer", employer: "Private client" },
    })).toThrow();
    expect(() => accountExperiencePatchSchema.parse({
      schemaVersion: 1,
      expectedRevision: 0,
      mutationId: "mutation-1",
      changes: { primaryRole: "freelancer" },
      userId: "another-user",
    })).toThrow();
  });

  it("rejects images, URLs, and unbounded fields from free design briefs", () => {
    const base = {
      schemaVersion: 1,
      id: "brief-1",
      expectedRevision: null,
      mutationId: "mutation-1",
      category: "ui",
      audience: "New product users",
      purpose: "Explain the onboarding value",
      style: "Clear and calm",
      goal: "Improve first-task completion",
      concern: "The hierarchy feels flat",
      constraints: "Mobile-first",
      mode: "mentor",
      step: 2,
      flowVersion: "brief-v1",
      status: "draft",
    } as const;

    expect(designBriefPutSchema.parse(base)).toMatchObject({ id: "brief-1", category: "ui" });
    expect(() => designBriefPutSchema.parse({ ...base, imageUrl: "https://example.com/private.png" })).toThrow();
    expect(() => designBriefPutSchema.parse({ ...base, purpose: "x".repeat(401) })).toThrow();
  });

  it("derives at most three priorities from unresolved allowlisted rubric items", () => {
    const request = selfReviewCreateSchema.parse({
      schemaVersion: 1,
      id: "session-1",
      mutationId: "mutation-1",
      rubricVersion: "rubric-v1",
      category: "ui",
      goalLabel: "Check the sign-up flow",
      responses: [
        { itemId: "ui-hierarchy", answer: "no" },
        { itemId: "ui-clarity", answer: "unsure" },
        { itemId: "ui-consistency", answer: "no" },
        { itemId: "ui-accessibility", answer: "no" },
      ],
    });

    expect(derivePriorityItemIds(request.category, request.responses)).toEqual([
      "ui-hierarchy",
      "ui-clarity",
      "ui-consistency",
    ]);
    expect(() => selfReviewCreateSchema.parse({
      ...request,
      responses: [{ itemId: "unsupported-item", answer: "no" }],
    })).toThrow();
  });

  it("requires an explicit record or all-history self-review deletion scope", () => {
    expect(() => selfReviewDeleteSchema.parse({ schemaVersion: 1, mutationId: "mutation-1" })).toThrow();
    expect(selfReviewDeleteSchema.parse({ schemaVersion: 1, mutationId: "mutation-1", scope: "all" })).toMatchObject({ scope: "all" });
  });

  it("discards expired guest progress and merges current progress monotonically", () => {
    const now = new Date("2026-08-28T12:00:00.000Z");
    const current = {
      activeFindingId: "finding-2",
      checkedActionIds: ["action-1"],
      completedAt: null,
      reflectionChoice: "needs-practice" as const,
      revealedFindingIds: ["finding-1", "finding-2"],
      sampleId: "form-together-friendly" as const,
      sampleVersion: "v1" as const,
      updatedAt: "2026-08-28T10:00:00.000Z",
    };
    const guest = guestSampleProgressSchema.parse({
      schemaVersion: 1,
      sampleId: "form-together-friendly",
      sampleVersion: "v1",
      activeFindingId: "finding-3",
      revealedFindingIds: ["finding-3"],
      checkedActionIds: ["action-2"],
      reflectionChoice: "ready-to-apply",
      createdAt: "2026-08-27T09:00:00.000Z",
      updatedAt: "2026-08-28T11:00:00.000Z",
    });

    expect(mergeSampleProgress(current, guest, now)).toMatchObject({
      activeFindingId: "finding-3",
      checkedActionIds: ["action-1", "action-2"],
      reflectionChoice: "ready-to-apply",
      revealedFindingIds: ["finding-1", "finding-2", "finding-3"],
    });
    expect(() => guestSampleProgressSchema.parse({
      ...guest,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    })).not.toThrow();
    expect(mergeSampleProgress(current, {
      ...guest,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }, now)).toEqual(current);
  });
});
