import { describe, expect, it } from "vitest";
import { GUEST_SAMPLE_PROGRESS_STORAGE_KEY, isGuestMergeVerified, readGuestSampleProgress, writeGuestSampleProgress } from "./guest-sample-progress";

describe("guest sample progress storage", () => {
  it("round-trips one bounded seven-day envelope", () => {
    const storage = createStorage();
    const now = new Date("2026-08-28T12:00:00.000Z");
    const progress = {
      schemaVersion: 1 as const,
      sampleId: "form-together-friendly" as const,
      sampleVersion: "v1" as const,
      activeFindingId: "finding-2",
      revealedFindingIds: ["finding-1", "finding-2"],
      checkedActionIds: ["action-1"],
      reflectionChoice: "needs-practice" as const,
      createdAt: "2026-08-27T12:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    };

    writeGuestSampleProgress(storage, progress, now);
    expect(readGuestSampleProgress(storage, now)).toEqual(progress);
  });

  it("removes malformed, unknown, and expired envelopes", () => {
    const now = new Date("2026-08-28T12:00:00.000Z");
    for (const raw of [
      "not-json",
      JSON.stringify({ schemaVersion: 2 }),
      JSON.stringify({
        schemaVersion: 1,
        sampleId: "form-together-friendly",
        sampleVersion: "v1",
        activeFindingId: null,
        revealedFindingIds: [],
        checkedActionIds: [],
        reflectionChoice: null,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }),
    ]) {
      const storage = createStorage(raw);
      expect(readGuestSampleProgress(storage, now)).toBeNull();
      expect(storage.getItem(GUEST_SAMPLE_PROGRESS_STORAGE_KEY)).toBeNull();
    }
  });

  it("clears only after the server state proves the merge", () => {
    const guest = {
      schemaVersion: 1 as const,
      sampleId: "form-together-friendly" as const,
      sampleVersion: "v1" as const,
      activeFindingId: "finding-2",
      revealedFindingIds: ["finding-1"],
      checkedActionIds: ["action-1"],
      reflectionChoice: "ready-to-apply" as const,
      createdAt: "2026-08-27T12:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    };
    expect(isGuestMergeVerified(guest, {
      sampleId: guest.sampleId,
      sampleVersion: guest.sampleVersion,
      revealedFindingIds: ["finding-1", "finding-2"],
      checkedActionIds: ["action-1"],
      reflectionChoice: "ready-to-apply",
    })).toBe(true);
    expect(isGuestMergeVerified(guest, {
      sampleId: guest.sampleId,
      sampleVersion: guest.sampleVersion,
      revealedFindingIds: [],
      checkedActionIds: ["action-1"],
      reflectionChoice: "ready-to-apply",
    })).toBe(false);
  });
});

function createStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(GUEST_SAMPLE_PROGRESS_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}
