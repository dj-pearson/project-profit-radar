import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Check, X, type LucideIcon } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export interface PremiumFeatureBullet {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

interface MobilePremiumUpsellSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Short, specific headline. e.g., "Unlock AI Estimating". */
  title: string;
  /** One-sentence value prop. */
  tagline: string;
  /** 3-5 bullets highlighting what's included. */
  features: PremiumFeatureBullet[];
  /** e.g., "$49/mo" — shown prominently. */
  price?: string;
  /** Secondary price label, e.g., "billed monthly". */
  priceSubLabel?: string;
  /** Optional trial badge, e.g., "14-day free trial". */
  trialLabel?: string;
  /** Primary CTA label. Defaults to "Start free trial" / "Upgrade". */
  primaryLabel?: string;
  onUpgrade: () => void;
  /** Optional link row under the CTA, e.g., "Compare plans". */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Optional footer note (terms, cancel anytime, etc.). */
  footer?: ReactNode;
}

/**
 * Premium upsell sheet for locked mobile features. Designed to feel
 * high-value: gradient header, animated icon, clear price, benefit
 * bullets, and a single prominent CTA. Respects reduced-motion.
 */
export function MobilePremiumUpsellSheet({
  isOpen,
  onClose,
  title,
  tagline,
  features,
  price,
  priceSubLabel,
  trialLabel,
  primaryLabel,
  onUpgrade,
  secondaryLabel,
  onSecondary,
  footer,
}: MobilePremiumUpsellSheetProps) {
  const haptics = useHaptics();
  const reduceMotion = useReducedMotion();

  const handleUpgrade = () => {
    haptics.success();
    onUpgrade();
  };

  const handleSecondary = () => {
    haptics.selection();
    onSecondary?.();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="-mt-2">
        {/* Gradient hero */}
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl mb-5 shadow-ios-3',
            'bg-gradient-to-br from-primary via-indigo-500 to-purple-600',
            'text-primary-foreground',
            'px-5 py-6',
            'ring-1 ring-inset ring-white/20'
          )}
        >
          {/* Specular highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/20 to-transparent"
            aria-hidden="true"
          />
          {/* Soft orb */}
          <div
            className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-white/15 blur-3xl"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center active:scale-95 transition-transform ring-1 ring-inset ring-white/25 tap-highlight-transparent"
          >
            <X className="h-4 w-4" />
          </button>

          <motion.div
            initial={reduceMotion ? false : { scale: 0.6, rotate: -15, opacity: 0 }}
            animate={reduceMotion ? undefined : { scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="relative inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-white/25 backdrop-blur mb-3 ring-1 ring-inset ring-white/30 shadow-ios-1"
            aria-hidden="true"
          >
            <Sparkles className="h-6 w-6" />
          </motion.div>

          {trialLabel && (
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider bg-white/20 rounded-full px-2 py-0.5 mb-2">
              {trialLabel}
            </span>
          )}

          <h2 className="text-2xl font-bold leading-tight">{title}</h2>
          <p className="text-sm text-white/90 mt-1 max-w-sm">{tagline}</p>

          {price && (
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{price}</span>
              {priceSubLabel && (
                <span className="text-sm text-white/80">{priceSubLabel}</span>
              )}
            </div>
          )}
        </div>

        {/* Feature bullets */}
        <ul className="space-y-3 mb-5" role="list">
          {features.map((feature, idx) => {
            const Icon = feature.icon ?? Check;
            return (
              <motion.li
                key={`${feature.title}-${idx}`}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + idx * 0.04, duration: 0.25 }}
                className="flex items-start gap-3"
              >
                <span className="flex-shrink-0 mt-0.5 h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center ring-1 ring-inset ring-primary/15 shadow-ios-1">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{feature.title}</p>
                  {feature.description && (
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ul>

        {/* CTAs */}
        <div className="space-y-2 pb-2">
          <Button
            type="button"
            className="w-full min-h-[52px] text-base font-semibold rounded-xl shadow-ios-glow tracking-tight tap-highlight-transparent"
            onClick={handleUpgrade}
          >
            {primaryLabel ?? (trialLabel ? 'Start free trial' : 'Upgrade now')}
          </Button>
          {secondaryLabel && onSecondary && (
            <Button
              type="button"
              variant="ghost"
              className="w-full min-h-[44px] rounded-xl tap-highlight-transparent"
              onClick={handleSecondary}
            >
              {secondaryLabel}
            </Button>
          )}
        </div>

        {footer && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">{footer}</p>
        )}
      </div>
    </BottomSheet>
  );
}
