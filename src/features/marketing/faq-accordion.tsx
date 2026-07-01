"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "@/components/motion/client-motion";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { motionDurations, motionEasing } from "@/lib/motion";

type FaqAccordionProps = {
  items: readonly (readonly [question: string, answer: string])[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const baseId = useId();
  const reduceMotion = usePrefersReducedMotion();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq-list">
      {items.map(([question, answer], index) => {
        const isOpen = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;

        return (
          <div className="faq-item" key={question}>
            <button
              type="button"
              className="faq-trigger"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
            >
              <span>{question}</span>
              <span className="faq-icon" aria-hidden="true">+</span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  className="faq-answer"
                  initial={reduceMotion ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={reduceMotion ? { opacity: 1, height: 0 } : { opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0 : motionDurations.step, ease: motionEasing }}
                >
                  <p>{answer}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
