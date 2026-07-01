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

export function LandingSmoothMotion({ children }: LandingSmoothMotionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(() => {
    registerIroGuideGsap();

    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const isSmallViewport = window.matchMedia("(max-width: 720px)").matches;
    const motionDisabled = reducedMotion || isSmallViewport;
    let smoother: ScrollSmoother | null = null;
    let observer: Observer | null = null;

    document.documentElement.dataset.motionEnhanced = motionDisabled ? "basic" : "smooth";

    if (!motionDisabled) {
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
    }

    const handleAnchorClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#']");
      if (!link) return;

      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();

      if (smoother) {
        smoother.scrollTo(target, true, "top 96px");
        return;
      }

      gsap.to(window, {
        duration: 0.72,
        ease: "power3.out",
        scrollTo: { y: target, offsetY: 86 },
      });
    };

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

    document.addEventListener("click", handleAnchorClick);
    ScrollTrigger.refresh();

    return () => {
      document.removeEventListener("click", handleAnchorClick);
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
