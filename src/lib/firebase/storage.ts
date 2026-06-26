import { getStorage, type FirebaseStorage } from "firebase/storage";
import type { ReviewSourceImage } from "@/domain/review";
import { getE2ELocalPrivateSourceImageUrl, isE2ELocalAuthEnabled } from "@/lib/e2e-local-auth";
import { getFirebaseClientApp } from "./app";

export function getFirebaseClientStorage(): FirebaseStorage {
  return getStorage(getFirebaseClientApp());
}

export async function getReviewSourceImageDownloadUrl(sourceImage: ReviewSourceImage, userId: string) {
  if (isE2ELocalAuthEnabled()) {
    const localUrl = getE2ELocalPrivateSourceImageUrl(sourceImage.storagePath, userId);
    if (!localUrl) throw new Error("Local private source image is unavailable.");
    return localUrl;
  }

  const [{ getDownloadURL, ref }, storage] = await Promise.all([
    import("firebase/storage"),
    Promise.resolve(getFirebaseClientStorage()),
  ]);

  return getDownloadURL(ref(storage, sourceImage.storagePath));
}
