"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const TargetCursor = dynamic(
  () => import("@/components/motion/target-cursor").then((module) => module.TargetCursor),
  { ssr: false },
);

const CURSOR_MEDIA_QUERY = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export function DeferredTargetCursor() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(CURSOR_MEDIA_QUERY);
    let timeoutId: number | undefined;

    const updateCursor = () => {
      window.clearTimeout(timeoutId);
      if (!mediaQuery.matches) {
        setEnabled(false);
        return;
      }

      timeoutId = window.setTimeout(() => setEnabled(true), 900);
    };

    updateCursor();
    mediaQuery.addEventListener("change", updateCursor);

    return () => {
      window.clearTimeout(timeoutId);
      mediaQuery.removeEventListener("change", updateCursor);
    };
  }, []);

  if (!enabled) return null;

  return (
    <TargetCursor
      targetSelector=".cursor-target, a[href], button, input, textarea, select, summary, [role='button']"
      hideDefaultCursor={false}
      hoverDuration={0.28}
      cursorColorOnTarget="#c8f45d"
    />
  );
}
