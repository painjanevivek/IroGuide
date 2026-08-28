import { describe, expect, it } from "vitest";
import { getCommunityCounterShard } from "./community-counter-storage";

describe("Community counter sharding", () => {
  it("is deterministic and remains within the configured shard range", () => {
    expect(getCommunityCounterShard("user-a:post-a:liked")).toBe(getCommunityCounterShard("user-a:post-a:liked"));
    expect(getCommunityCounterShard("user-a:post-a:liked")).toBeGreaterThanOrEqual(0);
    expect(getCommunityCounterShard("user-a:post-a:liked")).toBeLessThan(16);
  });

  it("distributes a synthetic hot-post workload instead of creating one write hotspot", () => {
    const counts = Array.from({ length: 16 }, () => 0);
    for (let index = 0; index < 10_000; index += 1) counts[getCommunityCounterShard(`account-${index}:hot-post:liked`)]! += 1;
    expect(counts.filter((count) => count > 0)).toHaveLength(16);
    expect(Math.max(...counts)).toBeLessThan(800);
    expect(Math.min(...counts)).toBeGreaterThan(450);
  });
});
