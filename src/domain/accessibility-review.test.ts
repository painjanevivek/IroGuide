import { describe, expect, it } from "vitest";
import { getAccessibilityIssue } from "./accessibility-review";

describe("accessibility review issue", () => {
  it("adds practical accessibility guidance for UI and website work", () => {
    expect(getAccessibilityIssue("ui")?.category).toBe("Accessibility");
    expect(getAccessibilityIssue("website")?.actions).toContain("Do not rely on color alone to communicate state or priority.");
  });

  it("does not force accessibility issues into unrelated categories", () => {
    expect(getAccessibilityIssue("logo")).toBeNull();
    expect(getAccessibilityIssue("poster")).toBeNull();
  });
});
