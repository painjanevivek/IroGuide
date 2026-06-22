import { describe, expect, it } from "vitest";
import { canUse, plans } from "./plans";

describe("plan entitlements", () => {
  it("enforces bounded free usage", () => {
    const free = getPlan("free");

    expect(canUse(free, { reviews: 2, followUps: 0 }, "review")).toBe(true);
    expect(canUse(free, { reviews: 3, followUps: 0 }, "review")).toBe(false);
    expect(canUse(free, { reviews: 0, followUps: 0 }, "follow-up")).toBe(false);
  });

  it("allows negotiated studio volume", () => {
    const studio = getPlan("studio");

    expect(canUse(studio, { reviews: 10000, followUps: 100 }, "review")).toBe(true);
    expect(canUse(studio, { reviews: 10000, followUps: 100 }, "follow-up")).toBe(true);
  });
});

function getPlan(id: string) {
  const plan = plans.find((candidate) => candidate.id === id);

  if (!plan) {
    throw new Error(`Missing test fixture for ${id} plan`);
  }

  return plan;
}
