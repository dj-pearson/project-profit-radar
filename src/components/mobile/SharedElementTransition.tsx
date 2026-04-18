import {
  createContext,
  useContext,
  useId,
  type ReactNode,
} from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * SharedElement — morph one UI element into another across a route
 * transition using framer-motion's layout animations.
 *
 * Usage: wrap the source (e.g., a project card on the list page) and
 * the destination (e.g., the detail screen hero) with the same `id`.
 * On navigation, AnimatePresence will morph position, size and border
 * radius between the two elements.
 *
 *   // list page
 *   <SharedElement id={`project-${p.id}`}>
 *     <Card>...</Card>
 *   </SharedElement>
 *
 *   // detail page
 *   <SharedElement id={`project-${p.id}`}>
 *     <Hero>...</Hero>
 *   </SharedElement>
 *
 * Must be rendered inside a <SharedElementRoot> (typically at the App
 * level) so AnimatePresence lives above any route transition.
 *
 * Honors prefers-reduced-motion: falls back to a crossfade without
 * position/size morphing.
 */
interface SharedElementContextValue {
  scope: string;
}

const SharedElementContext = createContext<SharedElementContextValue | null>(
  null,
);

/**
 * Provides a scope for shared-element transitions. Render once at the
 * app root (or inside a route wrapper) so layoutIds don't collide
 * between unrelated pages.
 */
export function SharedElementRoot({
  children,
  scope,
}: {
  children: ReactNode;
  /** Optional namespace; defaults to a generated id. */
  scope?: string;
}) {
  const generated = useId();
  return (
    <SharedElementContext.Provider value={{ scope: scope ?? generated }}>
      {children}
    </SharedElementContext.Provider>
  );
}

interface SharedElementProps {
  /** Stable id — must match across source + destination. */
  id: string;
  children: ReactNode;
  className?: string;
  /** Tag name for the outer motion element. Defaults to `div`. */
  as?: 'div' | 'article' | 'section' | 'li';
  /** Override the transition curve. */
  transition?: Transition;
}

const DEFAULT_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.9,
};

export function SharedElement({
  id,
  children,
  className,
  as = 'div',
  transition,
}: SharedElementProps) {
  const ctx = useContext(SharedElementContext);
  const reduceMotion = useReducedMotion();
  const layoutId = ctx ? `${ctx.scope}:${id}` : `shared:${id}`;

  // Reduce-motion path: crossfade only (no layout morphing).
  if (reduceMotion) {
    const Tag = as as 'div';
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = (as === 'article'
    ? motion.article
    : as === 'section'
      ? motion.section
      : as === 'li'
        ? motion.li
        : motion.div) as typeof motion.div;

  return (
    <MotionTag
      layoutId={layoutId}
      className={cn(className)}
      transition={transition ?? DEFAULT_TRANSITION}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Helper: builds a stable layoutId from a prefix and an arbitrary
 * entity id. Useful so call sites don't have to string-concat.
 */
export function sharedId(prefix: string, entityId: string | number): string {
  return `${prefix}-${entityId}`;
}
