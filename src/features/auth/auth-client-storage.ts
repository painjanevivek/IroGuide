import type { User } from "firebase/auth";

export function getStoredAvatar(user: User) {
  try {
    return localStorage.getItem(getAvatarStorageKey(user.uid)) ?? user.photoURL ?? "";
  } catch {
    return user.photoURL ?? "";
  }
}

export function storeAvatar(userId: string, dataUrl: string) {
  localStorage.setItem(getAvatarStorageKey(userId), dataUrl);
}

export function removeStoredAvatar(userId: string) {
  localStorage.removeItem(getAvatarStorageKey(userId));
}

export function hasStoredFirebaseAuthSession() {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("firebase:authUser:")) return true;
    }
  } catch {
    return false;
  }
  return false;
}

function getAvatarStorageKey(userId: string) {
  return `iroguide:avatar:${userId}`;
}
