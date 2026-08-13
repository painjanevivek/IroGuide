"use client";

import { useCallback } from "react";

export function SkipLink() {
  const focusAppContent = useCallback(() => {
    window.requestAnimationFrame(() => document.getElementById("app-content")?.focus());
  }, []);

  return (
    <a className="skip-link" href="#app-content" onClick={focusAppContent}>
      Skip to main content
    </a>
  );
}
