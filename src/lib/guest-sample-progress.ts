import {
  guestSampleProgressSchema,
  isGuestProgressExpired,
  type GuestSampleProgress,
} from "@/domain/product-activation";

export const GUEST_SAMPLE_PROGRESS_STORAGE_KEY = "iroguide:guest-sample-progress:v1";
export const GUEST_SAMPLE_PROGRESS_MAX_BYTES = 4 * 1024;

type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function readGuestSampleProgress(storage: StorageLike, now = new Date()) {
  const raw = storage.getItem(GUEST_SAMPLE_PROGRESS_STORAGE_KEY);
  if (!raw || new TextEncoder().encode(raw).byteLength > GUEST_SAMPLE_PROGRESS_MAX_BYTES) {
    if (raw) storage.removeItem(GUEST_SAMPLE_PROGRESS_STORAGE_KEY);
    return null;
  }

  try {
    const parsed = guestSampleProgressSchema.parse(JSON.parse(raw));
    if (isGuestProgressExpired(parsed, now)) {
      storage.removeItem(GUEST_SAMPLE_PROGRESS_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(GUEST_SAMPLE_PROGRESS_STORAGE_KEY);
    return null;
  }
}

export function writeGuestSampleProgress(storage: StorageLike, progress: GuestSampleProgress, now = new Date()) {
  const parsed = guestSampleProgressSchema.parse(progress);
  if (isGuestProgressExpired(parsed, now)) throw new Error("Guest sample progress is expired or invalid.");
  const serialized = JSON.stringify(parsed);
  if (new TextEncoder().encode(serialized).byteLength > GUEST_SAMPLE_PROGRESS_MAX_BYTES) {
    throw new Error("Guest sample progress exceeds the storage limit.");
  }
  storage.setItem(GUEST_SAMPLE_PROGRESS_STORAGE_KEY, serialized);
  return parsed;
}

export function clearGuestSampleProgress(storage: StorageLike) {
  storage.removeItem(GUEST_SAMPLE_PROGRESS_STORAGE_KEY);
}

export function isGuestMergeVerified(
  guest: GuestSampleProgress,
  stored: {
    sampleId: string;
    sampleVersion: string;
    revealedFindingIds: string[];
    checkedActionIds: string[];
    reflectionChoice: string | null;
  },
) {
  if (guest.sampleId !== stored.sampleId || guest.sampleVersion !== stored.sampleVersion) return false;
  if (!guest.revealedFindingIds.every((id) => stored.revealedFindingIds.includes(id))) return false;
  if (!guest.checkedActionIds.every((id) => stored.checkedActionIds.includes(id))) return false;
  return guest.reflectionChoice === null || stored.reflectionChoice === guest.reflectionChoice;
}
