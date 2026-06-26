import { type Transition, type Variants, motion } from 'framer-motion';
import type { JSX, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface MessageBubbleMotionProps {
  children: ReactNode;
  className?: string;
  isSelf?: boolean;
  delay?: number;
}

export function MessageBubbleMotion({
  children,
  className,
  isSelf = false,
  delay = 0,
}: MessageBubbleMotionProps): JSX.Element {
  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: 12,
      scale: 0.96,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
  };

  const transition: Transition = {
    delay,
    duration: 0.25,
    ease: [0.25, 0.46, 0.45, 0.94],
  };

  return (
    <motion.div
      className={cn(
        'w-fit max-w-[80%] rounded-2xl px-4 py-2.5',
        isSelf
          ? 'self-end bg-primary text-primary-foreground'
          : 'self-start bg-muted text-foreground',
        className,
      )}
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={transition}
      layout
    >
      {children}
    </motion.div>
  );
}
