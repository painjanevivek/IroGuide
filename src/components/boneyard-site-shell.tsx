"use client";

import { Skeleton } from "boneyard-js/react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import "@/bones/registry";

export function BoneyardSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const skeletonName = getRouteSkeletonName(pathname);
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);
  const routeLoading = pendingPathname !== null && pendingPathname !== pathname;

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
    <Skeleton
      name={skeletonName}
      loading={routeLoading}
      className="boneyard-site-shell"
      fallback={<IroGuideSkeletonScreen />}
      transition={260}
    >
      <div onClick={handleClick}>{children}</div>
    </Skeleton>
  );
}

function getRouteSkeletonName(pathname: string | null) {
  if (!pathname || pathname === "/") return "iroguide-route-home";
  const routeKey = pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return `iroguide-route-${routeKey || "home"}`;
}

function IroGuideSkeletonScreen() {
  return (
    <main className="boneyard-fallback" aria-label="Loading IroGuide">
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
