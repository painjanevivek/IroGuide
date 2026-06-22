"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { motionDurations, motionEasing, stepOffset } from "@/lib/motion";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

type StepTransitionProps = {
  children: ReactNode;
  className?: string;
  direction: 1 | -1;
  stepKey: string | number;
};

export function StepTransition({ children, className, direction, stepKey }: StepTransitionProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        className={className}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: direction * stepOffset }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: direction * -stepOffset }}
        transition={{ duration: reduceMotion ? 0 : motionDurations.step, ease: motionEasing }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
