import { describe, expect, it } from "vitest";
import { ownedSampleCatalog, rubricItemIdsByCategory } from "./product-activation";
import { deriveLearningPriorities, getLearningRubric, getSampleForRole, learningSamples } from "./learning";

describe("free learning content", () => {
  it("keeps every owned sample version, finding, action, and evidence region valid", () => {
    expect(learningSamples).toHaveLength(3);
    for (const sample of learningSamples) {
      const owned = ownedSampleCatalog[sample.id];
      expect(sample.version).toBe(owned.version);
      expect(sample.findings.map((finding) => finding.id)).toEqual(owned.findingIds);
      expect(sample.findings.map((finding) => finding.actionId)).toEqual(owned.actionIds);
      expect(sample.ownership).toEqual({ owner: "IroGuide", source: "repository-controlled original", use: "product education" });
      expect(sample.findings.every((finding) => sample.regions.some((region) => region.id === finding.regionId))).toBe(true);
      expect(sample.regions.every((region) => region.x >= 0 && region.y >= 0 && region.x + region.width <= 100 && region.y + region.height <= 100)).toBe(true);
    }
  });

  it("maps each primary cohort to its intended owned sample", () => {
    expect(getSampleForRole("beginner-designer").id).toBe("form-together-friendly");
    expect(getSampleForRole("freelancer").id).toBe("signal-noise-direct");
    expect(getSampleForRole("ui-ux-designer").id).toBe("fieldnote-mentor");
  });

  it("provides one explained rubric entry per allowlisted item", () => {
    for (const category of Object.keys(rubricItemIdsByCategory) as Array<keyof typeof rubricItemIdsByCategory>) {
      const items = getLearningRubric(category);
      expect(items.map((item) => item.id)).toEqual(rubricItemIdsByCategory[category]);
      expect(items.every((item) => item.explanation && item.example && item.verify)).toBe(true);
    }
  });

  it("derives no more than three priorities and places clear gaps before uncertainty", () => {
    expect(deriveLearningPriorities("ui", [
      { itemId: "ui-hierarchy", answer: "unsure" },
      { itemId: "ui-clarity", answer: "no" },
      { itemId: "ui-consistency", answer: "no" },
      { itemId: "ui-accessibility", answer: "no" },
    ]).map((item) => item.id)).toEqual(["ui-clarity", "ui-consistency", "ui-accessibility"]);
  });
});
