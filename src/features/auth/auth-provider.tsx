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
import { getFirebaseClientAuth } from "@/lib/firebase/client";

type AuthState = {
  user: User | null;
  avatarUrl: string;
  loading: boolean;
  error: string;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateAvatar: (dataUrl: string) => void;
  resetAvatar: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;

    try {
      const auth = getFirebaseClientAuth();
      void import("firebase/auth")
        .then(({ getRedirectResult, onAuthStateChanged }) => {
          if (!active) return;
          unsubscribe = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setAvatarUrl(nextUser ? getStoredAvatar(nextUser) : "");
            setLoading(false);
          });
          void getRedirectResult(auth).catch((redirectError) => {
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
    try {
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        await signInWithPopup(getFirebaseClientAuth(), provider);
      } catch (popupError) {
        const code = getAuthErrorCode(popupError);
        if (code === "auth/popup-blocked") {
          await signInWithRedirect(getFirebaseClientAuth(), provider);
          return;
        }
        throw popupError;
      }
    } catch (signInError) {
      setError(getAuthErrorMessage(signInError));
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError("");
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(getFirebaseClientAuth(), email.trim(), password);
    } catch (signInError) {
      const message = getAuthErrorMessage(signInError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    setError("");
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const credential = await createUserWithEmailAndPassword(getFirebaseClientAuth(), email.trim(), password);
      if (displayName?.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
      }
    } catch (signUpError) {
      const message = getAuthErrorMessage(signUpError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError("");
    try {
      const { signOut: firebaseSignOut } = await import("firebase/auth");
      await firebaseSignOut(getFirebaseClientAuth());
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Sign-out failed.");
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
    () => ({ user, avatarUrl, loading, error, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, updateAvatar, resetAvatar }),
    [avatarUrl, error, loading, resetAvatar, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, updateAvatar, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}

function getAuthErrorMessage(error: unknown) {
  const code = getAuthErrorCode(error);
  const message = error instanceof Error ? error.message : "";

  if (code === "auth/popup-closed-by-user" || message.includes("auth/popup-closed-by-user")) {
    return "Google sign-in was closed before it finished. Please try again.";
  }

  if (code === "auth/popup-blocked" || message.includes("auth/popup-blocked")) {
    return "Your browser blocked the Google sign-in popup. Allow popups for IroGuide and try again.";
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
