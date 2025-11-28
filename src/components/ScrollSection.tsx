import React, { useRef } from 'react';
import { motion, useInView, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScrollSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  viewport?: Parameters<typeof useInView>[1];
}

const ScrollSection: React.FC<ScrollSectionProps> = ({
  children,
  className,
  delay = 0,
  direction = 'up',
  viewport = { once: true, margin: "-100px" }
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, viewport);

  const getVariants = (): Variants => {
    const distance = 50;
    
    const initial: any = { opacity: 0 };
    if (direction === 'up') initial.y = distance;
    if (direction === 'down') initial.y = -distance;
    if (direction === 'left') initial.x = distance;
    if (direction === 'right') initial.x = -distance;

    return {
      hidden: initial,
      visible: { 
        opacity: 1, 
        x: 0, 
        y: 0,
        transition: {
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1], // Custom ease for smooth "GSAP-like" feel
          delay: delay
        }
      }
    };
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={getVariants()}
      className={cn("w-full", className)}
    >
      {children}
    </motion.div>
  );
};

export default ScrollSection;
