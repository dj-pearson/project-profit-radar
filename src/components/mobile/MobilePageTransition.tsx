import { ReactNode, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface MobilePageTransitionProps {
  children: ReactNode;
  /** Optional key override; defaults to the current pathname. */
  transitionKey?: string;
}

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefers(mql.matches);
    update();
    mql.addEventListener?.('change', update);
    return () => mql.removeEventListener?.('change', update);
  }, []);
  return prefers;
}

/**
 * Premium animated page transition for mobile routes.
 *
 * - Slide-from-right + fade enter, slide-to-left + fade exit (~180ms)
 * - Honors prefers-reduced-motion (fades only)
 * - No-op on md+ viewports (renders children directly)
 *
 * Usage: wrap an <Outlet /> or page content inside a MobileLayout:
 *
 *   <MobileLayout withBottomNav>
 *     <MobilePageTransition>
 *       <Outlet />
 *     </MobilePageTransition>
 *   </MobileLayout>
 */
export function MobilePageTransition({ children, transitionKey }: MobilePageTransitionProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!isMobile) {
    return <>{children}</>;
  }

  const key = transitionKey ?? location.pathname;

  const variants = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
