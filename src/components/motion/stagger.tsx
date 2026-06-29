"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { motionDurations, motionEmphasis, revealOffset } from "@/lib/motion";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

type StaggerProps = {
  children: ReactNode;
  className?: string;
  revealOnScroll?: boolean;
};

type StaggerItemProps = StaggerProps & {
  as?: "article" | "div";
};

export function Stagger({ children, className, revealOnScroll = false }: StaggerProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate={revealOnScroll ? undefined : "show"}
      whileInView={revealOnScroll ? "show" : undefined}
      viewport={revealOnScroll ? { once: true, amount: 0.18, margin: "0px 0px -80px" } : undefined}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduceMotion ? 0 : motionDurations.stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, as = "div" }: StaggerItemProps) {
  const reduceMotion = usePrefersReducedMotion();
  const Component = as === "article" ? motion.article : motion.div;

  return (
    <Component
      className={className}
      variants={{
        hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: revealOffset },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: reduceMotion ? 0 : motionDurations.reveal, ease: motionEmphasis }}
    >
      {children}
    </Component>
  );
}
