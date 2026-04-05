import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface MobileEmptyStateProps {
  /** Primary icon (Lucide) for the illustration circle. */
  icon: LucideIcon;
  /** Short, specific title. */
  title: string;
  /** Supportive sentence explaining what shows up here. */
  description: string;
  /** Primary CTA label. */
  primaryLabel?: string;
  /** Primary CTA handler. */
  onPrimary?: () => void;
  /** Optional secondary link label. */
  secondaryLabel?: string;
  /** Optional secondary link handler. */
  onSecondary?: () => void;
  /** Optional extra content (e.g., keyboard shortcut hint). */
  footer?: ReactNode;
  /** Tailwind color class for the icon background circle. */
  accentClass?: string;
  className?: string;
}

/**
 * Premium illustrated empty state for mobile list screens.
 * Animates in subtly, uses a colored icon medallion, and invites action.
 * Respects prefers-reduced-motion.
 */
export function MobileEmptyState({
  icon: Icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  footer,
  accentClass = 'bg-primary/10 text-primary',
  className,
}: MobileEmptyStateProps) {
  const reduceMotion = useReducedMotion();
  const haptics = useHaptics();

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'px-6 py-10',
        className,
      )}
    >
      <motion.div
        initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.05 }}
        className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center mb-4',
          accentClass,
        )}
        aria-hidden="true"
      >
        <Icon className="h-9 w-9" />
      </motion.div>

      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>

      {(primaryLabel || secondaryLabel) && (
        <div className="flex flex-col items-stretch gap-2 mt-5 w-full max-w-xs">
          {primaryLabel && onPrimary && (
            <Button
              type="button"
              className="min-h-[44px]"
              onClick={() => {
                haptics.impact('light');
                onPrimary();
              }}
            >
              {primaryLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button
              type="button"
              variant="ghost"
              className="min-h-[44px]"
              onClick={() => {
                haptics.selection();
                onSecondary();
              }}
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}

      {footer && <div className="mt-4 text-xs text-muted-foreground">{footer}</div>}
    </motion.div>
  );
}
