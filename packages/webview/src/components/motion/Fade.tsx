import { type Transition, type Variants, motion } from 'framer-motion';
import type { JSX, ReactNode } from 'react';

export interface FadeProps {
  children: ReactNode;
  className?: string;
  initial?: boolean;
  delay?: number;
  duration?: number;
}

const variants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function Fade({
  children,
  className,
  initial = true,
  delay = 0,
  duration = 0.2,
}: FadeProps): JSX.Element {
  const transition: Transition = { delay, duration, ease: 'easeOut' };

  return (
    <motion.div
      className={className}
      initial={initial ? 'hidden' : false}
      animate="visible"
      variants={variants}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
