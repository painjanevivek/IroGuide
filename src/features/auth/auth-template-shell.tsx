"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { useRef } from "react";
import type { ReactNode } from "react";
import { gsap, registerIroGuideGsap, useGSAP } from "@/components/motion/gsap-runtime";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

type AuthTemplateShellProps = {
  children: ReactNode;
  mode: "sign-in" | "sign-up";
};

export function AuthTemplateShell({ children, mode }: AuthTemplateShellProps) {
  const isSignUp = mode === "sign-up";
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(() => {
    if (reducedMotion) return;

    registerIroGuideGsap();

    gsap.from(".auth-template-brand, .auth-template-copy > *, .auth-template-back", {
      autoAlpha: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.075,
      y: 22,
    });

    gsap.from(".auth-template-card", {
      autoAlpha: 0,
      duration: 0.82,
      ease: "power3.out",
      rotateY: -8,
      x: 48,
    });

    gsap.from(".auth-preview-card", {
      autoAlpha: 0,
      duration: 0.95,
      ease: "elastic.out(1, 0.75)",
      rotate: -2,
      y: 44,
    });

    gsap.to(".auth-preview-topline strong", {
      duration: 1.15,
      ease: "sine.inOut",
      repeat: -1,
      scale: 1.08,
      yoyo: true,
    });

    gsap.to(".auth-preview-primary", {
      duration: 1.35,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      y: -6,
    });

    gsap.to(".auth-preview-accent", {
      duration: 1.55,
      ease: "sine.inOut",
      repeat: -1,
      rotate: 1.2,
      y: -10,
      yoyo: true,
    });

    gsap.to(".auth-preview-secondary", {
      duration: 1.85,
      ease: "sine.inOut",
      repeat: -1,
      rotate: -1,
      y: 8,
      yoyo: true,
    });

    gsap.fromTo(".auth-preview-scan-line", { xPercent: -130 }, {
      duration: 1.8,
      ease: "power2.inOut",
      repeat: -1,
      repeatDelay: 0.45,
      xPercent: 260,
    });

    gsap.to(".auth-preview-note svg", {
      duration: 0.95,
      ease: "sine.inOut",
      repeat: -1,
      y: -3,
      yoyo: true,
    });
  }, { dependencies: [reducedMotion, mode], scope: rootRef });

  return (
    <main className="auth-template" ref={rootRef}>
      <section className="auth-template-hero" aria-label="IroGuide account access">
        <Link href="/" className="wordmark auth-template-brand">
          <span className="wordmark-mark">I</span>
          IroGuide
        </Link>

        <div className="auth-template-copy">
          <p className="eyebrow">
            <Sparkles size={15} />
            {isSignUp ? "Create profile" : "Welcome back"}
          </p>
          <h1>{isSignUp ? "Start a private design critique workspace." : "Return to your critique workspace."}</h1>
          <p>
            Save reviews, drafts, source images, and practical next steps in one signed-in IroGuide account.
          </p>
        </div>

        <div className="auth-preview-card" aria-hidden="true">
          <div className="auth-preview-topline">
            <span>Private review</span>
            <strong>8.4</strong>
          </div>
          <div className="auth-preview-art">
            <span className="auth-preview-primary"><span className="auth-preview-scan-line" /></span>
            <span className="auth-preview-accent" />
            <span className="auth-preview-secondary" />
          </div>
          <div className="auth-preview-note">
            <LockKeyhole size={16} />
            <p>Context, critique, and saved progress stay tied to your account.</p>
          </div>
        </div>

        <Link className="auth-template-back" href="/">
          Back to landing <ArrowRight size={15} />
        </Link>
      </section>

      <section className="auth-template-panel">
        <div className="auth-template-card">{children}</div>
      </section>
    </main>
  );
}
