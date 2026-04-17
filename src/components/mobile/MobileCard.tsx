import React, { ReactNode, KeyboardEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';

type MobileCardSurface = 'solid' | 'glass' | 'glass-thin' | 'glass-thick';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  ariaLabel?: string;
  /** Visual surface. Defaults to 'glass' for a modern iOS feel. */
  surface?: MobileCardSurface;
}

const SURFACE_CLASSES: Record<MobileCardSurface, string> = {
  solid: 'bg-card border border-border shadow-ios-1',
  'glass-thin': 'glass-thin shadow-ios-1',
  glass: 'glass shadow-ios-2 border-transparent',
  'glass-thick': 'glass-thick shadow-ios-3 border-transparent',
};

/**
 * Mobile-optimized card with larger touch targets and optional glassmorphism.
 * Keyboard-accessible. Honors prefers-reduced-motion.
 */
export function MobileCard({
  children,
  className,
  onClick,
  interactive = false,
  ariaLabel,
  surface = 'glass',
}: MobileCardProps) {
  const isClickable = onClick || interactive;
  const haptics = useHaptics();

  const triggerClick = () => {
    if (!onClick) return;
    haptics.selection();
    onClick();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      triggerClick();
    }
  };

  return (
    <Card
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-[260ms] ease-ios',
        SURFACE_CLASSES[surface],
        isClickable
          ? 'cursor-pointer ios-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background tap-highlight-transparent'
          : '',
        className
      )}
      onClick={onClick ? triggerClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? ariaLabel : undefined}
    >
      {children}
    </Card>
  );
}

interface MobileCardItemProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  icon?: ReactNode;
  onClick?: () => void;
  action?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Mobile-optimized list card item with iOS-style hover/press feedback.
 */
export function MobileCardItem({
  title,
  subtitle,
  value,
  icon,
  onClick,
  action,
  className,
  ariaLabel,
}: MobileCardItemProps) {
  const haptics = useHaptics();

  const triggerClick = () => {
    if (!onClick) return;
    haptics.selection();
    onClick();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      triggerClick();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 min-h-[64px]',
        onClick &&
          'cursor-pointer ios-press active:bg-foreground/5 transition-colors duration-[150ms] ease-ios focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary tap-highlight-transparent',
        className
      )}
      onClick={onClick ? triggerClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (ariaLabel || title) : undefined}
    >
      {icon && (
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl',
            'bg-gradient-to-br from-primary/15 to-primary/5 text-primary',
            'ring-1 ring-inset ring-primary/10'
          )}
        >
          {icon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-base font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      {value && (
        <div className="flex-shrink-0 text-base font-semibold tabular-nums">
          {value}
        </div>
      )}

      {action ? (
        <div className="flex-shrink-0">{action}</div>
      ) : onClick ? (
        <ChevronRight className="flex-shrink-0 h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
      ) : null}
    </div>
  );
}

/**
 * Mobile-optimized stat card with glass surface and accent gradient icon tile.
 */
export function MobileStatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  onClick,
  className,
  surface = 'glass',
}: {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
  className?: string;
  surface?: MobileCardSurface;
}) {
  return (
    <MobileCard
      onClick={onClick}
      interactive={!!onClick}
      surface={surface}
      className={className}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">
              {value}
            </p>
            {trendValue && (
              <p
                className={cn(
                  'text-sm font-medium inline-flex items-center gap-1',
                  trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                  trend === 'down' && 'text-rose-600 dark:text-rose-400',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trendValue}
              </p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl',
                'bg-gradient-to-br from-primary/20 to-primary/5 text-primary',
                'ring-1 ring-inset ring-primary/15 shadow-ios-1'
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </MobileCard>
  );
}

/**
 * Mobile-optimized expandable card with iOS-style chevron rotation.
 */
export function MobileExpandableCard({
  title,
  subtitle,
  children,
  defaultExpanded = false,
  className,
  surface = 'glass',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  surface?: MobileCardSurface;
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const headerId = React.useId();
  const contentId = React.useId();

  const handleToggle = () => setIsExpanded(!isExpanded);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <MobileCard surface={surface} className={className}>
      <CardHeader
        className="cursor-pointer p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary tap-highlight-transparent"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        id={headerId}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base md:text-lg">{title}</CardTitle>
            {subtitle && (
              <CardDescription className="text-sm">{subtitle}</CardDescription>
            )}
          </div>
          <ChevronRight
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-[260ms] ease-ios',
              isExpanded && 'rotate-90'
            )}
            aria-hidden="true"
          />
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent
          className="p-4 pt-0 ios-fade-in"
          id={contentId}
          role="region"
          aria-labelledby={headerId}
        >
          {children}
        </CardContent>
      )}
    </MobileCard>
  );
}
