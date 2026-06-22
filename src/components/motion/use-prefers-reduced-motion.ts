"use client";

import { useReducedMotion } from "framer-motion";

export function usePrefersReducedMotion() {
  return useReducedMotion() ?? false;
}
