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
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

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
      const auth = getFirebaseClientAuth();
      await signInWithPopup(auth, googleProvider);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
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
