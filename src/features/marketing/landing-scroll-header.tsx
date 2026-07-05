"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { gsap, registerIroGuideGsap, ScrollTrigger } from "@/components/motion/gsap-runtime";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthTransitionLink } from "@/features/auth/auth-transition-link";
import { UserMenu } from "@/features/auth/user-menu";

const landingSections = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Modes", href: "#modes" },
  { label: "Example review", href: "#example" },
] as const;

export function LandingScrollHeader() {
  const { user, loading } = useAuth();
  const reducedMotion = usePrefersReducedMotion();
  const [activeHref, setActiveHref] = useState<(typeof landingSections)[number]["href"]>("#how-it-works");
  const rootRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const activeHrefRef = useRef(activeHref);

  const selectSection = useCallback((href: (typeof landingSections)[number]["href"]) => {
    if (href === activeHrefRef.current) return;

    activeHrefRef.current = href;
    setActiveHref(href);
  }, []);

  useLayoutEffect(() => {
    activeHrefRef.current = activeHref;
    const nav = navRef.current;
    const marker = markerRef.current;
    const activeLink = linkRefs.current[activeHref];
    if (!nav || !marker || !activeLink) return;

    const placeMarker = () => {
      return {
        height: activeLink.offsetHeight,
        width: activeLink.offsetWidth,
        x: activeLink.offsetLeft,
        y: activeLink.offsetTop,
      };
    };

    if (reducedMotion) {
      gsap.set(marker, { ...placeMarker(), opacity: 1 });
      return;
    }

    gsap.to(marker, {
      ...placeMarker(),
      opacity: 1,
      duration: 0.38,
      ease: "expo.out",
      overwrite: "auto",
    });
  }, [activeHref, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

    registerIroGuideGsap();

    const root = rootRef.current;
    const nav = navRef.current;
    const brandCluster = root?.querySelector<HTMLElement>(".landing-brand-cluster");
    const brandMark = root?.querySelector<HTMLElement>(".wordmark-mark");
    const brandText = root?.querySelector<HTMLElement>(".landing-scroll-brand span:last-child");
    const docsLink = root?.querySelector<HTMLElement>(".brand-docs-link");
    const actions = root?.querySelector<HTMLElement>(".landing-scroll-actions");
    const cta = root?.querySelector<HTMLElement>(".landing-scroll-cta");
    if (!root || !nav || !brandCluster || !brandMark || !brandText || !docsLink || !actions || !cta) return;

    if (window.matchMedia("(max-width: 720px)").matches) return;

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const finalPadding = 0.55 * rem;
    const finalGap = Math.min(Math.max(0.75 * rem, 0.016 * window.innerWidth), 1.2 * rem);
    const brandGap = 0.85 * rem;
    const finalBrandWidth = 38 + docsLink.offsetWidth + brandGap;
    const finalWidth = finalBrandWidth + nav.offsetWidth + actions.offsetWidth + (finalGap * 2) + (finalPadding * 2);
    const brandTextWidth = brandText.offsetWidth;

    const context = gsap.context(() => {
      gsap.set(root, {
        "--landing-active-color": "#6848e8",
        "--landing-marker-bg": "rgba(104,72,232,.12)",
        "--landing-marker-border": "rgba(104,72,232,.2)",
      });
      gsap.set(brandText, { width: brandTextWidth });

      gsap.timeline({
        scrollTrigger: {
          start: 0,
          end: 150,
          scrub: 0.45,
          invalidateOnRefresh: true,
        },
      })
        .to(root, {
          width: finalWidth,
          height: 64,
          paddingLeft: finalPadding,
          paddingRight: finalPadding,
          gap: finalGap,
          y: 14,
          backgroundColor: "rgba(9,9,15,.88)",
          backdropFilter: "blur(24px) saturate(150%)",
          borderColor: "rgba(255,255,255,.12)",
          borderRadius: 18,
          boxShadow: "0 20px 70px rgba(9,9,15,.22)",
          color: "#ffffff",
          "--landing-active-color": "#09090f",
          "--landing-marker-bg": "#c8f45d",
          "--landing-marker-border": "#c8f45d",
          ease: "none",
          duration: 1,
        }, 0)
        .to(brandText, { width: 0, opacity: 0, ease: "none", duration: 0.7 }, 0)
        .to(brandMark, { width: 38, height: 38, ease: "none", duration: 1 }, 0)
        .to(nav, {
          backgroundColor: "rgba(255,255,255,.06)",
          borderColor: "rgba(255,255,255,.09)",
          ease: "none",
          duration: 1,
        }, 0)
        .to(cta, {
          backgroundColor: "#ff6b57",
          boxShadow: "0 0 0 rgba(124,92,255,0)",
          ease: "none",
          duration: 1,
        }, 0);
    }, root);

    const triggers: ScrollTrigger[] = [
    ];

    landingSections.forEach((item) => {
      const section = document.querySelector(item.href);
      if (!section) return;

      triggers.push(ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onEnter: () => selectSection(item.href),
        onEnterBack: () => selectSection(item.href),
      }));
    });

    return () => {
      triggers.forEach((trigger) => trigger.kill());
      context.revert();
    };
  }, [loading, reducedMotion, selectSection, user]);

  return (
    <header className="site-header landing-scroll-header" ref={rootRef}>
      <div className="landing-brand-cluster">
        <Link className="wordmark landing-scroll-brand" href="/">
          <span className="wordmark-mark" aria-hidden="true">I</span>
          <span>IroGuide</span>
        </Link>
        <Link className="brand-docs-link" href="/docs" prefetch={false}>Docs</Link>
      </div>

      <nav className="landing-scroll-nav" aria-label="Landing page sections" ref={navRef}>
        <span className="landing-scroll-marker" aria-hidden="true" ref={markerRef} />
        {landingSections.map((item) => (
          <Link
            aria-current={activeHref === item.href ? "location" : undefined}
            className={activeHref === item.href ? "is-active" : undefined}
            href={item.href}
            key={item.href}
            onClick={() => selectSection(item.href)}
            prefetch={false}
            ref={(node) => {
              linkRefs.current[item.href] = node;
            }}
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="landing-scroll-actions">
        {!loading && !user && <AuthTransitionLink className="text-link desktop-only" href="/auth?mode=sign-in" prefetch={false}>Sign in</AuthTransitionLink>}
        {loading ? <span className="auth-status">Checking session...</span> : user ? <UserMenu /> : null}
        {user ? (
          <Link
            aria-label="Start a new review"
            className="button button-small landing-scroll-cta"
            href="/review/new"
            prefetch={false}
          >
            <span className="landing-scroll-cta-label">Start review</span>
            <ArrowRight size={16} />
          </Link>
        ) : (
          <AuthTransitionLink
            aria-label="Sign up for IroGuide"
            className="button button-small landing-scroll-cta"
            href="/auth?mode=sign-up"
            prefetch={false}
          >
            <span className="landing-scroll-cta-label">Sign up</span>
            <ArrowRight size={16} />
          </AuthTransitionLink>
        )}
      </div>
    </header>
  );
}
