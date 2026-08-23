import { describe, expect, it } from "vitest";
import { createPrivateCaseStudyDraft, PrivateCaseStudyEvidenceError } from "./private-case-study";

const review = {
  categoryLabel: "Website",
  documentId: "owner_review-1",
  issues: [{ recommendation: "Increase the primary action contrast." }],
  strengths: ["The page has a restrained visual system."],
  summary: "The main action competes with supporting content.",
  trustState: "server-verified" as const,
  userId: "owner",
};

describe("private case-study evidence", () => {
  it("keeps every claim private and traceable to owned evidence", () => {
    const draft = createPrivateCaseStudyDraft("owner", review);
    expect(draft.visibility).toBe("private");
    expect(draft.exportStatus).toBe("disabled");
    expect(draft.outcome).toBeNull();
    expect(draft.claims.every((claim) => claim.sourceId === review.documentId)).toBe(true);
  });

  it("rejects cross-owner and unverified evidence", () => {
    expect(() => createPrivateCaseStudyDraft("attacker", review)).toThrow(PrivateCaseStudyEvidenceError);
    expect(() => createPrivateCaseStudyDraft("owner", { ...review, trustState: "legacy-unverified" })).toThrow(PrivateCaseStudyEvidenceError);
  });
});
