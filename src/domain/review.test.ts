import { describe, expect, it } from "vitest";
import { reviewBriefSchema } from "./review";

describe("review brief validation", () => {
  it("requires enough context before critique submission", () => {
    const result = reviewBriefSchema.safeParse({
      audience: "ab",
      purpose: "ab",
      style: "ok",
      goal: "ab",
      concern: "",
    });

    expect(result.success).toBe(false);
  });

  it("trims accepted brief fields", () => {
    const result = reviewBriefSchema.parse({
      audience: " designers ",
      purpose: " portfolio review ",
      style: " bold ",
      goal: " improve hierarchy ",
      concern: "",
    });

    expect(result.audience).toBe("designers");
    expect(result.goal).toBe("improve hierarchy");
  });
});
