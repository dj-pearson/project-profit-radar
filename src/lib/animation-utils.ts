/**
 * Shared animation utilities for BuildDesk
 *
 * Animation strategy:
 * - Framer Motion: All scroll-triggered and viewport-aware animations
 *   (ScrollSection, ModernSection, ParallaxBackground)
 * - GSAP: Complex timeline sequences only (Hero.tsx), loaded lazily
 *   via requestIdleCallback to avoid blocking initial render
 * - CSS/Tailwind: Simple transitions (hover, focus, skeleton loading)
 *
 * IMPORTANT: Do NOT use GSAP for new components. Use Framer Motion or CSS.
 * GSAP is only retained for the Hero component's complex timeline animations.
 */

import type { Variants } from 'framer-motion';

/** Standard easing curve matching GSAP power3.out feel */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Standard animation duration in seconds */
export const DURATION_DEFAULT = 0.8;

/** Create directional reveal animation variants */
export function createRevealVariants(
  direction: 'up' | 'down' | 'left' | 'right' | 'none' = 'up',
  distance = 50,
  delay = 0,
  duration = DURATION_DEFAULT
): Variants {
  const initial: Record<string, number> = { opacity: 0 };
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
        duration,
        ease: EASE_OUT,
        delay,
      },
    },
  };
}

/** Create staggered children animation variants */
export function createStaggerVariants(
  staggerDelay = 0.1,
  direction: 'up' | 'down' | 'left' | 'right' | 'none' = 'up',
  distance = 30
): { container: Variants; item: Variants } {
  const initial: Record<string, number> = { opacity: 0 };
  if (direction === 'up') initial.y = distance;
  if (direction === 'down') initial.y = -distance;
  if (direction === 'left') initial.x = distance;
  if (direction === 'right') initial.x = -distance;

  return {
    container: {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    },
    item: {
      hidden: initial,
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration: DURATION_DEFAULT,
          ease: EASE_OUT,
        },
      },
    },
  };
}

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
