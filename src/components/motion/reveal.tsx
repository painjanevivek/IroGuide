"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { motionDurations, motionEmphasis, revealOffset } from "@/lib/motion";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: revealOffset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : motionDurations.reveal, ease: motionEmphasis, delay }}
    >
      {children}
    </motion.div>
  );
}
