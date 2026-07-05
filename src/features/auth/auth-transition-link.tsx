"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { gsap, registerIroGuideGsap } from "@/components/motion/gsap-runtime";

type AuthTransitionLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode;
  href: Route;
  prefetch?: boolean;
};

function shouldLetBrowserHandleClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

export function AuthTransitionLink({
  children,
  href,
  onClick,
  prefetch = false,
  ...props
}: AuthTransitionLinkProps) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const label = href.includes("sign-in") ? "Opening workspace" : "Creating profile";

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      props.target ||
      shouldLetBrowserHandleClick(event) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    event.preventDefault();
    if (isAnimating) return;

    const clickedLink = event.currentTarget;
    setIsAnimating(true);

    window.requestAnimationFrame(() => {
      registerIroGuideGsap();

      const overlay = document.querySelector<HTMLElement>(".auth-route-transition");
      if (!overlay) {
        router.push(href);
        return;
      }

      const panels = gsap.utils.toArray<HTMLElement>(".auth-route-panel", overlay);
      const copy = overlay.querySelector<HTMLElement>(".auth-route-transition-copy");

      gsap.timeline({ defaults: { ease: "expo.inOut" } })
        .set(overlay, { autoAlpha: 1, pointerEvents: "auto" })
        .set(panels, { scaleY: 0, transformOrigin: "bottom" })
        .set(copy, { opacity: 0, y: 28, scale: 0.94 })
        .to(clickedLink, { scale: 0.94, duration: 0.12, ease: "power2.out" }, 0)
        .to(panels, { scaleY: 1, duration: 0.64, stagger: 0.065 }, 0)
        .to(copy, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.8)" }, 0.22)
        .to(".auth-route-transition-mark", { rotate: 180, scale: 1.18, duration: 0.42, ease: "back.inOut(1.7)" }, 0.28)
        .call(() => router.push(href), undefined, 0.82);
    });
  };

  return (
    <>
      <Link href={href} prefetch={prefetch} onClick={handleClick} {...props}>
        {children}
      </Link>
      {isAnimating ? (
        <div className="auth-route-transition" aria-hidden="true">
          <span className="auth-route-panel auth-route-panel-ink" />
          <span className="auth-route-panel auth-route-panel-violet" />
          <span className="auth-route-panel auth-route-panel-coral" />
          <div className="auth-route-transition-copy">
            <span className="auth-route-transition-mark">I</span>
            <strong>{label}</strong>
            <span>IroGuide</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
