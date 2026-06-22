"use client";

import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "./auth-provider";

export function UserMenu() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) return <span className="auth-status">Checking session…</span>;
  if (!user) {
    return (
      <button className="button-secondary" type="button" onClick={() => void signInWithGoogle()}>
        Sign in <LogIn size={15} />
      </button>
    );
  }

  return (
    <div className="user-menu">
      <span>{user.displayName ?? user.email ?? "Signed in"}</span>
      <button className="button-secondary" type="button" onClick={() => void signOut()}>
        Sign out <LogOut size={15} />
      </button>
    </div>
  );
}
