"use client";

import { motion } from "framer-motion";
import { motionDurations, motionEasing } from "@/lib/motion";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

type AnimatedScoreBarProps = {
  value: number;
  max?: number;
};

export function AnimatedScoreBar({ value, max = 10 }: AnimatedScoreBarProps) {
  const reduceMotion = usePrefersReducedMotion();
  const width = `${Math.max(0, Math.min(value / max, 1)) * 100}%`;

  return (
    <motion.b
      aria-hidden="true"
      initial={reduceMotion ? { width } : { width: "0%" }}
      animate={{ width }}
      transition={{ duration: reduceMotion ? 0 : motionDurations.reveal, ease: motionEasing }}
    />
  );
}
