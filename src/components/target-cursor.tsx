"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

type TargetCursorProps = {
  targetSelector?: string;
  spinDuration?: number;
  hideDefaultCursor?: boolean;
  hoverDuration?: number;
  parallaxOn?: boolean;
  cursorColor?: string;
  cursorColorOnTarget?: string;
};

type Point = { x: number; y: number };

const getContainingBlock = (element: HTMLElement | null) => {
  let node = element?.parentElement;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (
      style.transform !== "none" ||
      style.perspective !== "none" ||
      style.filter !== "none" ||
      style.willChange.includes("transform") ||
      style.willChange.includes("perspective") ||
      style.willChange.includes("filter") ||
      /paint|layout|strict|content/.test(style.contain)
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

const getContainingBlockOffset = (block: HTMLElement | null): Point => {
  if (!block) return { x: 0, y: 0 };
  const rect = block.getBoundingClientRect();
  return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
};

export function TargetCursor({
  targetSelector = ".cursor-target",
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  parallaxOn = true,
  cursorColor = "#ffffff",
  cursorColorOnTarget,
}: TargetCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<HTMLElement[]>([]);
  const spinTl = useRef<gsap.core.Timeline | null>(null);
  const containingBlockRef = useRef<HTMLElement | null>(null);
  const targetCornerPositionsRef = useRef<Point[] | null>(null);
  const tickerFnRef = useRef<(() => void) | null>(null);
  const activeStrengthRef = useRef({ current: 0 });
  const prefersReducedMotion = usePrefersReducedMotion();

  const constants = useMemo(() => ({ borderWidth: 3, cornerSize: 12 }), []);

  const moveCursor = useCallback((x: number, y: number) => {
    if (!cursorRef.current) return;
    const offset = getContainingBlockOffset(containingBlockRef.current);
    gsap.to(cursorRef.current, {
      x: x - offset.x,
      y: y - offset.y,
      duration: 0.1,
      ease: "power3.out",
    });
  }, []);

  useEffect(() => {
    if (
      prefersReducedMotion ||
      !cursorRef.current ||
      window.matchMedia("(pointer: coarse), (max-width: 768px)").matches
    ) {
      return;
    }

    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) document.body.style.cursor = "none";

    const cursor = cursorRef.current;
    const activeStrength = activeStrengthRef.current;
    cornersRef.current = Array.from(cursor.querySelectorAll<HTMLElement>(".target-cursor-corner"));
    containingBlockRef.current = getContainingBlock(cursor);

    let activeTarget: HTMLElement | null = null;
    let currentLeaveHandler: (() => void) | null = null;
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;

    const getOffset = () => getContainingBlockOffset(containingBlockRef.current);
    const cleanupTarget = (target: HTMLElement) => {
      if (currentLeaveHandler) target.removeEventListener("mouseleave", currentLeaveHandler);
      currentLeaveHandler = null;
    };

    const initialOffset = getOffset();
    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2 - initialOffset.x,
      y: window.innerHeight / 2 - initialOffset.y,
    });

    const createSpinTimeline = () => {
      spinTl.current?.kill();
      spinTl.current = gsap.timeline({ repeat: -1 }).to(cursor, {
        rotation: "+=360",
        duration: spinDuration,
        ease: "none",
      });
    };

    createSpinTimeline();

    const tickerFn = () => {
      if (!targetCornerPositionsRef.current || !cursorRef.current) return;
      const strength = activeStrength.current;
      if (strength === 0) return;

      const cursorX = Number(gsap.getProperty(cursorRef.current, "x"));
      const cursorY = Number(gsap.getProperty(cursorRef.current, "y"));

      cornersRef.current.forEach((corner, index) => {
        const currentX = Number(gsap.getProperty(corner, "x"));
        const currentY = Number(gsap.getProperty(corner, "y"));
        const target = targetCornerPositionsRef.current?.[index];
        if (!target) return;

        const finalX = currentX + (target.x - cursorX - currentX) * strength;
        const finalY = currentY + (target.y - cursorY - currentY) * strength;
        const duration = strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05;

        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration,
          ease: duration === 0 ? "none" : "power1.out",
          overwrite: "auto",
        });
      });
    };

    tickerFnRef.current = tickerFn;

    const moveHandler = (event: MouseEvent) => moveCursor(event.clientX, event.clientY);
    const scrollHandler = () => {
      if (!activeTarget || !cursorRef.current) return;
      const offset = getOffset();
      const mouseX = Number(gsap.getProperty(cursorRef.current, "x")) + offset.x;
      const mouseY = Number(gsap.getProperty(cursorRef.current, "y")) + offset.y;
      const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      const isStillOverTarget =
        elementUnderMouse &&
        (elementUnderMouse === activeTarget || elementUnderMouse.closest(targetSelector) === activeTarget);
      if (!isStillOverTarget && currentLeaveHandler) currentLeaveHandler();
    };

    const mouseDownHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 });
      gsap.to(cursor, { scale: 0.9, duration: 0.2 });
    };

    const mouseUpHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 1, duration: 0.3 });
      gsap.to(cursor, { scale: 1, duration: 0.2 });
    };

    const enterHandler = (event: MouseEvent) => {
      const directTarget = event.target instanceof Element ? event.target : null;
      let current = directTarget;
      let target: HTMLElement | null = null;

      while (current && current !== document.body) {
        if (current.matches(targetSelector)) {
          target = current as HTMLElement;
          break;
        }
        current = current.parentElement;
      }

      if (!target || activeTarget === target) return;
      if (activeTarget) cleanupTarget(activeTarget);
      if (resumeTimeout) clearTimeout(resumeTimeout);

      activeTarget = target;
      cornersRef.current.forEach((corner) => gsap.killTweensOf(corner, "x,y"));
      gsap.killTweensOf(cursor, "rotation");
      spinTl.current?.pause();
      gsap.set(cursor, { rotation: 0 });

      if (cursorColorOnTarget) {
        gsap.to(cornersRef.current, { borderColor: cursorColorOnTarget, duration: 0.15, ease: "power2.out" });
        if (dotRef.current) {
          gsap.to(dotRef.current, { backgroundColor: cursorColorOnTarget, duration: 0.15, ease: "power2.out" });
        }
      }

      const rect = target.getBoundingClientRect();
      const offset = getOffset();
      const cursorX = Number(gsap.getProperty(cursor, "x"));
      const cursorY = Number(gsap.getProperty(cursor, "y"));

      targetCornerPositionsRef.current = [
        { x: rect.left - constants.borderWidth - offset.x, y: rect.top - constants.borderWidth - offset.y },
        { x: rect.right + constants.borderWidth - constants.cornerSize - offset.x, y: rect.top - constants.borderWidth - offset.y },
        {
          x: rect.right + constants.borderWidth - constants.cornerSize - offset.x,
          y: rect.bottom + constants.borderWidth - constants.cornerSize - offset.y,
        },
        { x: rect.left - constants.borderWidth - offset.x, y: rect.bottom + constants.borderWidth - constants.cornerSize - offset.y },
      ];

      gsap.ticker.add(tickerFn);
      gsap.to(activeStrength, { current: 1, duration: hoverDuration, ease: "power2.out" });

      cornersRef.current.forEach((corner, index) => {
        const cornerTarget = targetCornerPositionsRef.current?.[index];
        if (!cornerTarget) return;
        gsap.to(corner, {
          x: cornerTarget.x - cursorX,
          y: cornerTarget.y - cursorY,
          duration: 0.2,
          ease: "power2.out",
        });
      });

      const leaveHandler = () => {
        gsap.ticker.remove(tickerFn);
        targetCornerPositionsRef.current = null;
        gsap.set(activeStrength, { current: 0, overwrite: true });
        activeTarget = null;

        if (cursorColorOnTarget) {
          gsap.to(cornersRef.current, { borderColor: cursorColor, duration: 0.15, ease: "power2.out" });
          if (dotRef.current) gsap.to(dotRef.current, { backgroundColor: cursorColor, duration: 0.15, ease: "power2.out" });
        }

        gsap.killTweensOf(cornersRef.current, "x,y");
        const positions = [
          { x: -constants.cornerSize * 1.5, y: -constants.cornerSize * 1.5 },
          { x: constants.cornerSize * 0.5, y: -constants.cornerSize * 1.5 },
          { x: constants.cornerSize * 0.5, y: constants.cornerSize * 0.5 },
          { x: -constants.cornerSize * 1.5, y: constants.cornerSize * 0.5 },
        ];
        const tl = gsap.timeline();
        cornersRef.current.forEach((corner, index) => {
          tl.to(corner, { ...positions[index], duration: 0.3, ease: "power3.out" }, 0);
        });

        resumeTimeout = setTimeout(() => {
          if (!activeTarget && spinTl.current) createSpinTimeline();
          resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      };

      currentLeaveHandler = leaveHandler;
      target.addEventListener("mouseleave", leaveHandler);
    };

    const resizeHandler = () => {
      containingBlockRef.current = getContainingBlock(cursor);
    };

    window.addEventListener("mousemove", moveHandler);
    window.addEventListener("mouseover", enterHandler, { passive: true });
    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("mousedown", mouseDownHandler);
    window.addEventListener("mouseup", mouseUpHandler);
    window.addEventListener("resize", resizeHandler);

    return () => {
      if (tickerFnRef.current) gsap.ticker.remove(tickerFnRef.current);
      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("mouseover", enterHandler);
      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("mousedown", mouseDownHandler);
      window.removeEventListener("mouseup", mouseUpHandler);
      window.removeEventListener("resize", resizeHandler);
      if (activeTarget) cleanupTarget(activeTarget);
      if (resumeTimeout) clearTimeout(resumeTimeout);
      spinTl.current?.kill();
      document.body.style.cursor = originalCursor;
      targetCornerPositionsRef.current = null;
      activeStrength.current = 0;
    };
  }, [
    constants,
    cursorColor,
    cursorColorOnTarget,
    hideDefaultCursor,
    hoverDuration,
    moveCursor,
    parallaxOn,
    prefersReducedMotion,
    spinDuration,
    targetSelector,
  ]);

  if (prefersReducedMotion) return null;

  return (
    <div ref={cursorRef} className="target-cursor-wrapper" aria-hidden="true">
      <div ref={dotRef} className="target-cursor-dot" style={{ backgroundColor: cursorColor }} />
      <div className="target-cursor-corner corner-tl" style={{ borderColor: cursorColor }} />
      <div className="target-cursor-corner corner-tr" style={{ borderColor: cursorColor }} />
      <div className="target-cursor-corner corner-br" style={{ borderColor: cursorColor }} />
      <div className="target-cursor-corner corner-bl" style={{ borderColor: cursorColor }} />
    </div>
  );
}
