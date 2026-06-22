"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "./auth-provider";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <span className="auth-status">Checking session...</span>;
  if (!user) return <span className="auth-status">Google sign-in required</span>;

  return (
    <div className="user-menu">
      <span>{user.displayName ?? user.email ?? user.phoneNumber ?? "Signed in"}</span>
      <button className="button-secondary" type="button" onClick={() => void signOut()}>
        Sign out <LogOut size={15} />
      </button>
    </div>
  );
}
