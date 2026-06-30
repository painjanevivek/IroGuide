"use client";

import type { User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AccountSyncManager } from "./account-sync-manager";
import { clearE2ELocalUser, createE2ELocalUser, isE2ELocalAuthEnabled, readE2ELocalUser, writeE2ELocalUser } from "@/lib/e2e-local-auth";

type AuthState = {
  user: User | null;
  avatarUrl: string;
  providerIds: string[];
  loading: boolean;
  error: string;
  deleteAccount: () => Promise<ReviewDataDeletionResult>;
  purgeReviewData: () => Promise<ReviewDataDeletionResult>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  linkGoogleProvider: () => Promise<void>;
  updateAvatar: (dataUrl: string) => void;
  resetAvatar: () => void;
};

type ReviewDataDeletionResult = {
  deleted: boolean;
  draftsDeleted: number;
  reviewsDeleted: number;
  sourceImagesDeleted: number;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;

    if (isE2ELocalAuthEnabled()) {
      queueMicrotask(() => {
        if (!active) return;
        const nextUser = readE2ELocalUser();
        setUser(nextUser);
        setAvatarUrl(nextUser ? getStoredAvatar(nextUser) : "");
        setProviderIds(getProviderIds(nextUser));
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }

    if (!shouldInitializeAuthSession()) {
      queueMicrotask(() => {
        if (!active) return;
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }

    try {
      void Promise.all([import("@/lib/firebase/auth"), import("firebase/auth")])
        .then(([{ getFirebaseClientAuth }, { getRedirectResult, onAuthStateChanged }]) => {
          if (!active) return;
          const auth = getFirebaseClientAuth();
          unsubscribe = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setAvatarUrl(nextUser ? getStoredAvatar(nextUser) : "");
            setProviderIds(getProviderIds(nextUser));
            setLoading(false);
          });
          void getRedirectResult(auth).then((credential) => {
            if (!active || !credential?.user) return;
            setUser(credential.user);
            setAvatarUrl(getStoredAvatar(credential.user));
            setProviderIds(getProviderIds(credential.user));
            setLoading(false);
          }).catch((redirectError) => {
            if (!active) return;
            if (getAuthErrorCode(redirectError) === "auth/internal-error") {
              return;
            }
            setError(getAuthErrorMessage(redirectError));
          });
        })
        .catch((setupError) => {
          if (!active) return;
          const message = setupError instanceof Error ? setupError.message : "Firebase authentication could not load.";
          setError(message);
          setLoading(false);
        });
    } catch (setupError) {
      const message = setupError instanceof Error ? setupError.message : "Firebase is not configured.";
      queueMicrotask(() => {
        if (!active) return;
        setError(message);
        setLoading(false);
      });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError("");
    if (isE2ELocalAuthEnabled()) {
      const nextUser = createE2ELocalUser("e2e@iroguide.test", "IroGuide E2E");
      writeE2ELocalUser(nextUser);
      setUser(nextUser);
      setAvatarUrl(getStoredAvatar(nextUser));
      setProviderIds(getProviderIds(nextUser));
      return true;
    }

    try {
      const [{ getFirebaseClientAuth }, { GoogleAuthProvider, signInWithPopup, signInWithRedirect }] = await Promise.all([
        import("@/lib/firebase/auth"),
        import("firebase/auth"),
      ]);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const auth = getFirebaseClientAuth();
      try {
        const credential = await signInWithPopup(auth, provider);
        setUser(credential.user);
        setAvatarUrl(getStoredAvatar(credential.user));
        setProviderIds(getProviderIds(credential.user));
        return Boolean(credential.user);
      } catch (popupError) {
        if (!shouldFallbackToGoogleRedirect(popupError)) throw popupError;
        await signInWithRedirect(auth, provider);
        return false;
      }
    } catch (signInError) {
      const message = getAuthErrorMessage(signInError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError("");
    if (isE2ELocalAuthEnabled()) {
      if (password === "wrong-password") {
        throw new Error("The email or password is incorrect.");
      }
      const nextUser = createE2ELocalUser(email);
      writeE2ELocalUser(nextUser);
      setUser(nextUser);
      setAvatarUrl(getStoredAvatar(nextUser));
      setProviderIds(getProviderIds(nextUser));
      return;
    }

    try {
      const [{ getFirebaseClientAuth }, { signInWithEmailAndPassword }] = await Promise.all([
        import("@/lib/firebase/auth"),
        import("firebase/auth"),
      ]);
      const credential = await signInWithEmailAndPassword(getFirebaseClientAuth(), email.trim(), password);
      setUser(credential.user);
      setAvatarUrl(getStoredAvatar(credential.user));
      setProviderIds(getProviderIds(credential.user));
    } catch (signInError) {
      const message = getAuthErrorMessage(signInError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    setError("");
    if (isE2ELocalAuthEnabled()) {
      const nextUser = createE2ELocalUser(email, displayName);
      writeE2ELocalUser(nextUser);
      setUser(nextUser);
      setAvatarUrl(getStoredAvatar(nextUser));
      setProviderIds(getProviderIds(nextUser));
      return;
    }

    try {
      const [{ getFirebaseClientAuth }, { createUserWithEmailAndPassword, updateProfile }] = await Promise.all([
        import("@/lib/firebase/auth"),
        import("firebase/auth"),
      ]);
      const credential = await createUserWithEmailAndPassword(getFirebaseClientAuth(), email.trim(), password);
      if (displayName?.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
      }
      setUser(credential.user);
      setAvatarUrl(getStoredAvatar(credential.user));
      setProviderIds(getProviderIds(credential.user));
    } catch (signUpError) {
      const message = getAuthErrorMessage(signUpError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError("");
    if (isE2ELocalAuthEnabled()) return;

    try {
      const [{ getFirebaseClientAuth }, { sendPasswordResetEmail }] = await Promise.all([
        import("@/lib/firebase/auth"),
        import("firebase/auth"),
      ]);
      await sendPasswordResetEmail(getFirebaseClientAuth(), email.trim(), {
        url: `${window.location.origin}/auth/sign-in`,
      });
    } catch (resetError) {
      const message = getAuthErrorMessage(resetError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError("");
    if (isE2ELocalAuthEnabled()) {
      clearE2ELocalUser();
      setUser(null);
      setAvatarUrl("");
      setProviderIds([]);
      return;
    }

    try {
      const [{ getFirebaseClientAuth }, { signOut: firebaseSignOut }] = await Promise.all([
        import("@/lib/firebase/auth"),
        import("firebase/auth"),
      ]);
      await firebaseSignOut(getFirebaseClientAuth());
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Sign-out failed.");
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, nextPassword: string) => {
    setError("");
    try {
      const [{ getFirebaseClientAuth }, { EmailAuthProvider, reauthenticateWithCredential, updatePassword }] = await Promise.all([
        import("@/lib/firebase/auth"),
        import("firebase/auth"),
      ]);
      const currentUser = getFirebaseClientAuth().currentUser;
      if (!currentUser?.email) throw new Error("Sign in again before changing your password.");
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, nextPassword);
    } catch (passwordError) {
      const message = getAuthErrorMessage(passwordError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const linkGoogleProvider = useCallback(async () => {
    setError("");
    try {
      const [{ getFirebaseClientAuth }, { GoogleAuthProvider, linkWithPopup }] = await Promise.all([
        import("@/lib/firebase/auth"),
        import("firebase/auth"),
      ]);
      const currentUser = getFirebaseClientAuth().currentUser;
      if (!currentUser) throw new Error("Sign in again before linking Google.");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await linkWithPopup(currentUser, provider);
      await currentUser.reload();
      const refreshedUser = getFirebaseClientAuth().currentUser;
      setUser(refreshedUser);
      setProviderIds(getProviderIds(refreshedUser));
    } catch (linkError) {
      const message = getAuthErrorMessage(linkError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const purgeReviewData = useCallback(async () => {
    setError("");
    try {
      const currentUser = user;
      if (!currentUser) throw new Error("Sign in again before deleting review history.");
      const result = await requestAuthenticatedDeletion({
        failureMessage: "Review history deletion failed.",
        path: "/api/account/reviews",
        token: await currentUser.getIdToken(true),
        unavailableMessage: "Review history deletion is not available right now.",
      });
      await clearLocalReviewData(currentUser.uid);
      return result;
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Review history deletion failed.";
      setError(message);
      throw new Error(message);
    }
  }, [user]);

  const deleteAccount = useCallback(async () => {
    setError("");
    try {
      const [{ getFirebaseClientAuth }, { signOut: firebaseSignOut }] = await Promise.all([
        import("@/lib/firebase/auth"),
        import("firebase/auth"),
      ]);
      const currentUser = getFirebaseClientAuth().currentUser;
      if (!currentUser) throw new Error("Sign in again before deleting your account.");
      const result = await requestAuthenticatedDeletion({
        failureMessage: "Account deletion failed.",
        path: "/api/account",
        token: await currentUser.getIdToken(true),
        unavailableMessage: "Account deletion is not available right now.",
      });
      await clearLocalAccountData(currentUser.uid);
      await firebaseSignOut(getFirebaseClientAuth());
      setUser(null);
      setAvatarUrl("");
      setProviderIds([]);
      return result;
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Account deletion failed.";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const updateAvatar = useCallback((dataUrl: string) => {
    if (!user) return;
    try {
      localStorage.setItem(getAvatarStorageKey(user.uid), dataUrl);
    } catch {
      setError("The avatar could not be saved in this browser. Try a smaller image.");
      return;
    }
    setAvatarUrl(dataUrl);
  }, [user]);

  const resetAvatar = useCallback(() => {
    if (!user) return;
    try {
      localStorage.removeItem(getAvatarStorageKey(user.uid));
    } catch {
      // Keeping the in-memory fallback is still useful if localStorage is unavailable.
    }
    setAvatarUrl(user.photoURL ?? "");
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({ user, avatarUrl, providerIds, loading, error, deleteAccount, purgeReviewData, signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, signOut, changePassword, linkGoogleProvider, updateAvatar, resetAvatar }),
    [avatarUrl, changePassword, deleteAccount, error, linkGoogleProvider, loading, providerIds, purgeReviewData, resetAvatar, resetPassword, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, updateAvatar, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AccountSyncManager user={user} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}

async function requestAuthenticatedDeletion({
  failureMessage,
  path,
  token,
  unavailableMessage,
}: {
  failureMessage: string;
  path: "/api/account" | "/api/account/reviews";
  token: string;
  unavailableMessage: string;
}) {
  const { requestJsonWithFallback } = await import("@/lib/api-client");
  const payload = await requestJsonWithFallback({
    path,
    unavailableMessage,
    failureMessage,
    init: {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  return parseReviewDataDeletionResult(payload, failureMessage);
}

function parseReviewDataDeletionResult(payload: unknown, fallbackMessage: string): ReviewDataDeletionResult {
  if (
    typeof payload === "object"
    && payload !== null
    && "deleted" in payload
    && "draftsDeleted" in payload
    && "reviewsDeleted" in payload
    && "sourceImagesDeleted" in payload
    && typeof payload.deleted === "boolean"
    && typeof payload.draftsDeleted === "number"
    && typeof payload.reviewsDeleted === "number"
    && typeof payload.sourceImagesDeleted === "number"
  ) {
    return {
      deleted: payload.deleted,
      draftsDeleted: payload.draftsDeleted,
      reviewsDeleted: payload.reviewsDeleted,
      sourceImagesDeleted: payload.sourceImagesDeleted,
    };
  }

  throw new Error(fallbackMessage);
}

async function clearLocalReviewData(userId: string) {
  const { clearCachedReviewDocuments } = await import("@/lib/review-persistence");
  clearCachedReviewDocuments(userId);
}

async function clearLocalAccountData(userId: string) {
  await clearLocalReviewData(userId);
  try {
    localStorage.removeItem(getAvatarStorageKey(userId));
  } catch {
    // The server-side deletion has already completed; local cleanup is best effort.
  }
}

function getAuthErrorMessage(error: unknown) {
  const code = getAuthErrorCode(error);
  const message = error instanceof Error ? error.message : "";

  if (code === "auth/popup-closed-by-user" || message.includes("auth/popup-closed-by-user")) {
    return "Google sign-in was closed before it finished. Please try again.";
  }

  if (code === "auth/popup-blocked" || message.includes("auth/popup-blocked")) {
    return "Your browser blocked the Google sign-in popup. Use the Google redirect flow or allow popups for IroGuide and try again.";
  }

  if (code === "auth/network-request-failed" || message.includes("auth/network-request-failed")) {
    return "Google sign-in could not reach Firebase. Check your connection and try again.";
  }

  if (code === "auth/web-storage-unsupported" || message.includes("auth/web-storage-unsupported")) {
    return "This browser is blocking the storage Google sign-in needs. Enable cookies and site data for IroGuide.";
  }

  if (code === "auth/auth-domain-config-required" || message.includes("auth/auth-domain-config-required")) {
    return "Firebase Google sign-in is missing its auth domain configuration.";
  }

  if (code === "auth/invalid-api-key" || message.includes("auth/invalid-api-key")) {
    return "Firebase Google sign-in is using an invalid web API key.";
  }

  if (code === "auth/requires-recent-login" || message.includes("auth/requires-recent-login")) {
    return "For security, sign out and sign in again before changing this account setting.";
  }

  if (code === "auth/provider-already-linked" || message.includes("auth/provider-already-linked")) {
    return "Google is already linked to this account.";
  }

  if (code === "auth/credential-already-in-use" || message.includes("auth/credential-already-in-use")) {
    return "That Google account is already linked to another IroGuide account.";
  }

  if (code === "auth/account-exists-with-different-credential" || message.includes("auth/account-exists-with-different-credential")) {
    return "An account already exists with that Google email. Sign in with that method first.";
  }

  if (code === "auth/unauthorized-domain" || message.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized in Firebase. Add your site domain in Firebase Authentication > Settings > Authorized domains.";
  }

  if (code === "auth/operation-not-allowed" || message.includes("auth/operation-not-allowed")) {
    return "This sign-in method is not enabled in Firebase. Open Firebase Authentication > Sign-in method and enable the provider you want to use.";
  }

  if (code === "auth/internal-error" || message.includes("auth/internal-error")) {
    return "Google sign-in could not complete. Try again, or use manual email sign-in below.";
  }

  if (code === "auth/email-already-in-use" || message.includes("auth/email-already-in-use")) {
    return "An account already exists for this email. Sign in instead.";
  }

  if (code === "auth/invalid-credential" || message.includes("auth/invalid-credential")) {
    return "The email or password is incorrect.";
  }

  if (code === "auth/invalid-email" || message.includes("auth/invalid-email")) {
    return "Enter a valid email address.";
  }

  if (code === "auth/weak-password" || message.includes("auth/weak-password")) {
    return "Use a stronger password with at least 6 characters.";
  }

  if (code === "auth/user-disabled" || message.includes("auth/user-disabled")) {
    return "This account has been disabled.";
  }

  return message || "Google sign-in failed. Please try again.";
}

function getAuthErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
}

function shouldFallbackToGoogleRedirect(error: unknown) {
  const code = getAuthErrorCode(error);
  const message = error instanceof Error ? error.message : "";
  return code === "auth/popup-blocked"
    || code === "auth/cancelled-popup-request"
    || message.includes("auth/popup-blocked")
    || message.includes("auth/cancelled-popup-request");
}

function getAvatarStorageKey(uid: string) {
  return `iroguide:avatar:${uid}`;
}

function getStoredAvatar(user: User) {
  try {
    return localStorage.getItem(getAvatarStorageKey(user.uid)) ?? user.photoURL ?? "";
  } catch {
    return user.photoURL ?? "";
  }
}

function getProviderIds(user: User | null) {
  return user?.providerData.map((provider) => provider.providerId) ?? [];
}

function shouldInitializeAuthSession() {
  if (typeof window === "undefined") return false;
  return isAuthSensitivePath(window.location.pathname) || hasStoredFirebaseAuthSession();
}

function isAuthSensitivePath(pathname: string) {
  return (
    pathname.startsWith("/auth")
    || pathname.startsWith("/admin")
    || pathname.startsWith("/community")
    || pathname.startsWith("/dashboard")
    || pathname.startsWith("/profile")
    || pathname.startsWith("/review")
  );
}

function hasStoredFirebaseAuthSession() {
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
