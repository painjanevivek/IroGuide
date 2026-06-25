"use client";

import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { useAuth } from "./auth-provider";
import { UserMenu } from "./user-menu";

export function LandingHeaderActions() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="header-actions">
        <span className="auth-status">Checking session...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="header-actions">
        <Link className="text-link desktop-only" href="/community" prefetch={false}>Community</Link>
        <Link className="text-link desktop-only" href="/dashboard" prefetch={false}>Dashboard</Link>
        <UserMenu />
      </div>
    );
  }

  return (
    <div className="header-actions">
      <Link className="text-link desktop-only" href="/community" prefetch={false}>Community</Link>
      <Link className="text-link desktop-only" href="/dashboard" prefetch={false}>Dashboard</Link>
      <Link className="text-link desktop-only" href="/auth?mode=sign-in" prefetch={false} data-analytics-event="nav_sign_in_click">Sign in</Link>
      <Link className="button button-small" href="/auth?mode=sign-up" prefetch={false} data-analytics-event="nav_sign_up_click">Sign up <ArrowRight size={16} /></Link>
    </div>
  );
}

export function HeaderAuthLinks({ includeDashboard = true }: { includeDashboard?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) return <span className="auth-status">Checking session...</span>;

  if (user) {
    return (
      <>
        {includeDashboard && <Link href="/dashboard" prefetch={false}>Dashboard</Link>}
        <UserMenu />
      </>
    );
  }

  return (
    <>
      {includeDashboard && <Link href="/dashboard" prefetch={false}>Dashboard</Link>}
      <Link href="/auth?mode=sign-in" prefetch={false} data-analytics-event="nav_sign_in_click">Sign in</Link>
      <Link className="button button-small" href="/auth?mode=sign-up" prefetch={false} data-analytics-event="nav_sign_up_click">Sign up <ArrowRight /></Link>
    </>
  );
}

export function LandingHeroAuthButton() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Link className="button-secondary hero-auth-button" href="/dashboard" prefetch={false} data-analytics-event="hero_workspace_click">Open workspace <ArrowRight size={18} /></Link>;
  return <Link className="button-secondary hero-auth-button" href="/auth?mode=sign-up" prefetch={false} data-analytics-event="hero_sign_up_click">Sign up free <ArrowRight size={18} /></Link>;
}

export function LandingFinalAuthActions() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <div className="final-cta-actions">
        <Link className="button button-lime button-large" href="/review/new" prefetch={false} data-analytics-event="final_new_review_click">New review <ArrowRight size={19} /></Link>
        <Link className="button-quiet beta-link" href="/profile" prefetch={false}>Profile <Upload size={19} /></Link>
      </div>
    );
  }

  return (
    <div className="final-cta-actions">
      <Link className="button button-lime button-large" href="/auth?mode=sign-up" prefetch={false} data-analytics-event="final_sign_up_click">Sign up <ArrowRight size={19} /></Link>
      <Link className="button-quiet beta-link" href="/auth?mode=sign-in" prefetch={false} data-analytics-event="final_sign_in_click">Sign in <Upload size={19} /></Link>
    </div>
  );
}
