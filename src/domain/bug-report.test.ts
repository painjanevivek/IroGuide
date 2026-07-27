import { describe, expect, it } from "vitest";
import { bugReportRequestSchema } from "./bug-report";

describe("bug report request", () => {
  it("accepts a valid public bug report", () => {
    const parsed = bugReportRequestSchema.parse({
      name: "Vivek Painjane",
      email: "vivek@example.com",
      problem: "The contact page bug report button does not open.",
      pageUrl: "https://iroguide.com/contact",
      company: "",
    });

    expect(parsed).toEqual({
      name: "Vivek Painjane",
      email: "vivek@example.com",
      problem: "The contact page bug report button does not open.",
      pageUrl: "https://iroguide.com/contact",
      company: "",
    });
  });

  it("rejects invalid email and short problem details", () => {
    const parsed = bugReportRequestSchema.safeParse({
      name: "V",
      email: "not-an-email",
      problem: "broken",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects filled honeypot values", () => {
    const parsed = bugReportRequestSchema.safeParse({
      name: "Vivek Painjane",
      email: "vivek@example.com",
      problem: "The contact form failed after pressing submit.",
      company: "spam",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects non-HTTP page URLs", () => {
    const report = {
      name: "Vivek Painjane",
      email: "vivek@example.com",
      problem: "The contact form failed after pressing submit.",
    };

    expect(bugReportRequestSchema.safeParse({ ...report, pageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(bugReportRequestSchema.safeParse({ ...report, pageUrl: "data:text/html,test" }).success).toBe(false);
  });
});
