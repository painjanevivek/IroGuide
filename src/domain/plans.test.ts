import { describe, expect, it } from "vitest";
import { canUse, plans } from "./plans";

describe("plan entitlements", () => {
  it("enforces bounded free usage", () => { const free = plans.find((plan) => plan.id === "free")!; expect(canUse(free, { reviews: 2, followUps: 0 }, "review")).toBe(true); expect(canUse(free, { reviews: 3, followUps: 0 }, "review")).toBe(false); });
  it("allows negotiated studio volume", () => { const studio = plans.find((plan) => plan.id === "studio")!; expect(canUse(studio, { reviews: 10000, followUps: 100 }, "review")).toBe(true); });
});
