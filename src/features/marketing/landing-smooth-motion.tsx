"use client";

import { ReactNode, useRef } from "react";
import {
  gsap,
  Observer,
  registerIroGuideGsap,
  ScrollSmoother,
  ScrollTrigger,
  useGSAP,
} from "@/components/motion/gsap-runtime";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

type LandingSmoothMotionProps = {
  children: ReactNode;
};

function getAnchorTarget(hash: string) {
  if (!hash.startsWith("#") || hash.length === 1) return null;

  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

export function LandingSmoothMotion({ children }: LandingSmoothMotionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const isSmallViewport = window.matchMedia("(max-width: 720px)").matches;
    const motionDisabled = reducedMotion || isSmallViewport;
    let smoother: ScrollSmoother | null = null;
    let observer: Observer | null = null;
    let initialAnchorFrame: number | null = null;

    document.documentElement.dataset.motionEnhanced = motionDisabled ? "basic" : "smooth";

    if (!motionDisabled) {
      registerIroGuideGsap();
      smoother = ScrollSmoother.create({
        wrapper,
        content,
        smooth: 0.85,
        smoothTouch: 0.12,
        effects: true,
        normalizeScroll: true,
        ignoreMobileResize: true,
      });
      document.documentElement.dataset.gsapSmoother = "active";

      const initialTarget = getAnchorTarget(window.location.hash);

      if (initialTarget) {
        initialAnchorFrame = window.requestAnimationFrame(() => {
          smoother?.scrollTo(initialTarget, false, "top 96px");
        });
      }
    }

    const handleAnchorClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#']");
      if (!link) return;

      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = getAnchorTarget(hash);
      if (!target) return;

      event.preventDefault();
      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }

      if (motionDisabled) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }

      if (smoother) {
        smoother.scrollTo(target, false, "top 96px");
        return;
      }

      gsap.to(window, {
        duration: 0.72,
        ease: "power3.out",
        scrollTo: { y: target, offsetY: 86 },
      });
    };

    if (!motionDisabled) {
      observer = Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        tolerance: 16,
        onChange: () => {
          document.documentElement.dataset.gestureActive = "true";
          gsap.delayedCall(0.24, () => {
            document.documentElement.dataset.gestureActive = "false";
          });
        },
      });
    }

    document.addEventListener("click", handleAnchorClick);
    if (!motionDisabled) {
      ScrollTrigger.refresh();
    }

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      if (initialAnchorFrame !== null) {
        window.cancelAnimationFrame(initialAnchorFrame);
      }
      observer?.kill();
      smoother?.kill();
      delete document.documentElement.dataset.gsapSmoother;
      delete document.documentElement.dataset.motionEnhanced;
      delete document.documentElement.dataset.gestureActive;
    };
  }, { dependencies: [reducedMotion], scope: wrapperRef });

  return (
    <div className="landing-smooth-wrapper" ref={wrapperRef}>
      <div className="landing-smooth-content" ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
