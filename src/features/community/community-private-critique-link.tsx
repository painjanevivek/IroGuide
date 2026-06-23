"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";

type CommunityPrivateCritiqueLinkProps = {
  className?: string;
};

export function CommunityPrivateCritiqueLink({ className = "button button-lime" }: CommunityPrivateCritiqueLinkProps) {
  const { user, loading } = useAuth();
  const href = user ? "/review/new" : "/auth?mode=sign-up";
  const label = user ? "Click for Private Critique" : "Get started";

  if (loading) {
    return <span className={className} role="status" aria-live="polite">Checking session...</span>;
  }

  return (
    <Link className={className} href={href}>
      {label} <ArrowRight size={17} />
    </Link>
  );
}
