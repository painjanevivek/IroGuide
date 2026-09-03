"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

export function BoneyardSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);
  const routeLoading = pendingPathname !== null && pendingPathname !== pathname;

  useEffect(() => {
    document.documentElement.dataset.appHydrated = "true";
  }, []);

  useEffect(() => {
    if (!routeLoading) return;
    const timeoutId = window.setTimeout(() => setPendingPathname(null), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [routeLoading]);

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(target instanceof HTMLAnchorElement) || target.target || target.hasAttribute("download")) return;

    const nextUrl = new URL(target.href, window.location.href);
    if (nextUrl.origin !== window.location.origin || (nextUrl.hash && nextUrl.pathname === window.location.pathname)) return;

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
    if (nextPath !== currentPath) setPendingPathname(nextUrl.pathname);
  }

  return (
    <div className="boneyard-site-shell" aria-busy={routeLoading} onClick={handleClick}>
      {routeLoading ? <IroGuideSkeletonScreen /> : children}
    </div>
  );
}

function IroGuideSkeletonScreen() {
  return (
    <main className="boneyard-fallback" aria-label="Loading IroGuide" aria-live="polite">
      <p className="sr-only" role="status">Loading the next page</p>
      <div className="boneyard-fallback-header">
        <div className="boneyard-fallback-brand">
          <span className="boneyard-fallback-logo" />
          <span className="boneyard-line boneyard-line-brand" />
        </div>
        <div className="boneyard-fallback-nav" aria-hidden="true">
          <span className="boneyard-line" />
          <span className="boneyard-line" />
          <span className="boneyard-line" />
        </div>
        <span className="boneyard-pill" />
      </div>

      <section className="boneyard-fallback-hero">
        <div className="boneyard-fallback-copy">
          <span className="boneyard-chip" />
          <span className="boneyard-title boneyard-title-wide" />
          <span className="boneyard-title" />
          <span className="boneyard-copy-line" />
          <span className="boneyard-copy-line boneyard-copy-line-short" />
          <div className="boneyard-fallback-actions">
            <span className="boneyard-button" />
            <span className="boneyard-text-button" />
          </div>
        </div>

        <div className="boneyard-fallback-card" aria-hidden="true">
          <span className="boneyard-card-top" />
          <span className="boneyard-card-art" />
          <span className="boneyard-card-float boneyard-card-float-score" />
          <span className="boneyard-card-float boneyard-card-float-note" />
        </div>
      </section>
    </main>
  );
}
