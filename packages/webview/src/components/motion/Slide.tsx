import { type Transition, type Variants, motion } from 'framer-motion';
import type { ReactNode } from 'react';

export type SlideDirection = 'up' | 'down' | 'left' | 'right';

export interface SlideProps {
  children: ReactNode;
  className?: string;
  direction?: SlideDirection;
  distance?: number;
  initial?: boolean;
  delay?: number;
  duration?: number;
}

const offsetByDirection: Record<SlideDirection, { x?: number; y?: number }> = {
  up: { y: 16 },
  down: { y: -16 },
  left: { x: 16 },
  right: { x: -16 },
};

export function Slide({
  children,
  className,
  direction = 'up',
  distance = 16,
  initial = true,
  delay = 0,
  duration = 0.25,
}: SlideProps): JSX.Element {
  const offset = offsetByDirection[direction];
  const variants: Variants = {
    hidden: {
      opacity: 0,
      x: offset.x ? offset.x * (distance / 16) : 0,
      y: offset.y ? offset.y * (distance / 16) : 0,
    },
    visible: { opacity: 1, x: 0, y: 0 },
  };
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
