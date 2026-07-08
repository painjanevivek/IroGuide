"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { GalleryVerticalEnd, LayoutDashboard, LogOut, MessageSquareText, PenLine, UserRound } from "lucide-react";
import { useAuth } from "./auth-provider";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New review", href: "/review/new", icon: PenLine },
  { label: "Portfolio", href: "/portfolio", icon: GalleryVerticalEnd },
  { label: "Community", href: "/community", icon: MessageSquareText },
  { label: "Profile", href: "/profile", icon: UserRound },
] as const;

export function UserMenu() {
  const { user, avatarUrl, loading, signOut } = useAuth();

  if (loading) return <span className="auth-status">Checking session...</span>;
  if (!user) return <span className="auth-status">Google sign-in required</span>;

  return (
    <details className="user-menu">
      <summary aria-label="Open workspace menu">
        <UserAvatar label={getUserLabel(user.displayName, user.email, user.phoneNumber)} src={avatarUrl} />
      </summary>
      <div className="user-menu-panel">
        <div className="user-menu-heading">
          <span>Workspace</span>
          <strong>{getUserLabel(user.displayName, user.email, user.phoneNumber)}</strong>
        </div>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} className="user-menu-item" href={item.href} style={{ "--item-index": index } as CSSProperties}>
              <Icon size={16} /> {item.label}
            </Link>
          );
        })}
        <button className="user-menu-item" type="button" onClick={() => void signOut()} style={{ "--item-index": menuItems.length } as CSSProperties}>
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
