"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { motionDurations, motionEmphasis, revealOffset } from "@/lib/motion";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

type StaggerProps = {
  children: ReactNode;
  className?: string;
};

export function Stagger({ children, className }: StaggerProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduceMotion ? 0 : motionDurations.stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: revealOffset },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: reduceMotion ? 0 : motionDurations.reveal, ease: motionEmphasis }}
    >
      {children}
    </motion.div>
  );
}
