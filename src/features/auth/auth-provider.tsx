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
  loading: boolean;
  error: string;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;

    try {
      const auth = getFirebaseClientAuth();
      void import("firebase/auth")
        .then(({ onAuthStateChanged }) => {
          if (!active) return;
          unsubscribe = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setLoading(false);
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
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(getFirebaseClientAuth(), provider);
    } catch (signInError) {
      setError(getAuthErrorMessage(signInError));
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

  const value = useMemo<AuthState>(
    () => ({ user, loading, error, signInWithGoogle, signOut }),
    [error, loading, signInWithGoogle, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}

function getAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
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
    return "Google login is not enabled in Firebase. Open Firebase Authentication > Sign-in method and enable Google.";
  }

  if (code === "auth/internal-error" || message.includes("auth/internal-error")) {
    return "Google sign-in could not open correctly. Make sure this domain is added in Firebase Authorized domains, then refresh and try again.";
  }

  return message || "Google sign-in failed. Please try again.";
}
