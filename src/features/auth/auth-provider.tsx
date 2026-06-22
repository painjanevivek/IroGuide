"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
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
    try {
      const auth = getFirebaseClientAuth();
      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      });
    } catch (setupError) {
      const message = setupError instanceof Error ? setupError.message : "Firebase is not configured.";
      queueMicrotask(() => {
        setError(message);
        setLoading(false);
      });
    }
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError("");
    try {
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
  const message = error instanceof Error ? error.message : "";

  if (message.includes("auth/popup-closed-by-user")) {
    return "Google sign-in was closed before it finished. Please try again.";
  }

  if (message.includes("auth/popup-blocked")) {
    return "Your browser blocked the Google sign-in popup. Allow popups for IroGuide and try again.";
  }

  if (message.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized in Firebase. Add your site domain in Firebase Authentication > Settings > Authorized domains.";
  }

  return message || "Google sign-in failed. Please try again.";
}
