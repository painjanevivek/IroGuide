"use client";

import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { AuthTransitionLink } from "./auth-transition-link";
import { useAuth } from "./auth-provider";
import { UserMenu } from "./user-menu";
import { ReviewLaunchLink } from "@/features/capabilities/review-launch-link";
import { useLaunchCapabilities } from "@/features/capabilities/launch-capabilities-provider";

export function LandingHeaderActions() {
  const { user, loading } = useAuth();
  const { community } = useLaunchCapabilities();

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
        <Link className="text-link desktop-only" href="/docs" prefetch={false}>Docs</Link>
        {community && <Link className="text-link desktop-only" href="/community" prefetch={false}>Community</Link>}
        <Link className="text-link desktop-only" href="/dashboard" prefetch={false}>Dashboard</Link>
        <UserMenu />
      </div>
    );
  }

  return (
    <div className="header-actions">
      <Link className="text-link desktop-only" href="/docs" prefetch={false}>Docs</Link>
      {community && <Link className="text-link desktop-only" href="/community" prefetch={false}>Community</Link>}
      <Link className="text-link desktop-only" href="/dashboard" prefetch={false}>Dashboard</Link>
      <AuthTransitionLink className="text-link desktop-only" href="/auth?mode=sign-in" prefetch={false} data-analytics-event="nav_sign_in_click">Sign in</AuthTransitionLink>
      <AuthTransitionLink className="button button-small" href="/auth?mode=sign-up" prefetch={false} data-analytics-event="nav_sign_up_click">Sign up <ArrowRight size={16} /></AuthTransitionLink>
    </div>
  );
}

export function HeaderAuthLinks({ includeDashboard = true }: { includeDashboard?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) return <span className="auth-status">Checking session...</span>;

  if (user) {
    return (
      <>
        <Link href="/docs" prefetch={false}>Docs</Link>
        {includeDashboard && <Link href="/dashboard" prefetch={false}>Dashboard</Link>}
        <UserMenu />
      </>
    );
  }

  return (
    <>
      <Link href="/docs" prefetch={false}>Docs</Link>
      {includeDashboard && <Link href="/dashboard" prefetch={false}>Dashboard</Link>}
      <AuthTransitionLink href="/auth?mode=sign-in" prefetch={false} data-analytics-event="nav_sign_in_click">Sign in</AuthTransitionLink>
      <AuthTransitionLink className="button button-small" href="/auth?mode=sign-up" prefetch={false} data-analytics-event="nav_sign_up_click">Sign up <ArrowRight /></AuthTransitionLink>
    </>
  );
}

export function LandingHeroAuthButton() {
  const { user, loading } = useAuth();

  return (
    <span className="hero-auth-slot">
      {loading ? (
        <span className="button-secondary hero-auth-button hero-auth-placeholder" aria-hidden="true">Sign up free <ArrowRight size={18} /></span>
      ) : user ? (
        <Link className="button-secondary hero-auth-button" href="/dashboard" prefetch={false} data-analytics-event="hero_workspace_click">Open workspace <ArrowRight size={18} /></Link>
      ) : (
        <AuthTransitionLink className="button-secondary hero-auth-button" href="/auth?mode=sign-up" prefetch={false} data-analytics-event="hero_sign_up_click">Sign up free <ArrowRight size={18} /></AuthTransitionLink>
      )}
    </span>
  );
}

export function LandingFinalAuthActions() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <div className="final-cta-actions">
        <ReviewLaunchLink className="button button-lime button-large" enabledLabel="New review" eventName="final_new_review_click" />
        <Link className="button-quiet beta-link" href="/profile" prefetch={false}>Profile <Upload size={19} /></Link>
      </div>
    );
  }

  return (
    <div className="final-cta-actions">
      <AuthTransitionLink className="button button-lime button-large" href="/auth?mode=sign-up" prefetch={false} data-analytics-event="final_sign_up_click">Sign up <ArrowRight size={19} /></AuthTransitionLink>
      <AuthTransitionLink className="button-quiet beta-link" href="/auth?mode=sign-in" prefetch={false} data-analytics-event="final_sign_in_click">Sign in <Upload size={19} /></AuthTransitionLink>
    </div>
  );
}
