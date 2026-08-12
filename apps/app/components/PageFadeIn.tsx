"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

// Soft mount-in for page content so it doesn't hard-block into the DOM.
// Purpose: prevent the jarring teleport from nothing to fully-rendered on
// every navigation. Kept subtle — small offset, low bounce, transform+opacity
// only — since this plays on every page visit, not a rare moment.
export default function PageFadeIn({ children, style, className }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      style={style}
      initial={
        reduce
          ? { opacity: 0 }
          : { opacity: 0, transform: "translateY(6px) scale(0.99)" }
      }
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
    >
      {children}
    </motion.div>
  );
}
