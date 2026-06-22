"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "./auth-provider";

export function UserMenu() {
  const { user, avatarUrl, loading, signOut } = useAuth();

  if (loading) return <span className="auth-status">Checking session...</span>;
  if (!user) return <span className="auth-status">Google sign-in required</span>;

  return (
    <details className="user-menu">
      <summary aria-label="Open profile menu">
        <UserAvatar label={getUserLabel(user.displayName, user.email, user.phoneNumber)} src={avatarUrl} />
      </summary>
      <div className="user-menu-panel">
        <Link href="/profile"><UserRound size={16} /> Profile</Link>
        <button type="button" onClick={() => void signOut()}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </details>
  );
}

export function UserAvatar({ label, src, size = "md" }: { label: string; src?: string; size?: "md" | "lg" }) {
  const initials = getInitials(label);

  return (
    <span className={`user-avatar user-avatar-${size}`} aria-hidden="true">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}

function getUserLabel(displayName: string | null, email: string | null, phoneNumber: string | null) {
  return displayName ?? email ?? phoneNumber ?? "IroGuide user";
}

function getInitials(label: string) {
  const words = label
    .replace(/@.+$/, "")
    .split(/\s|[._-]/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return "I";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
