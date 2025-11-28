import React, { ReactNode, KeyboardEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  ariaLabel?: string;
}

/**
 * Mobile-optimized card with larger touch targets
 * Includes keyboard accessibility support
 */
export function MobileCard({
  children,
  className,
  onClick,
  interactive = false,
  ariaLabel,
}: MobileCardProps) {
  const isClickable = onClick || interactive;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        'border rounded-lg',
        isClickable
          ? 'cursor-pointer active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          : '',
        className
      )}
      onClick={onClick}
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
 * Mobile-optimized list card item
 * Includes keyboard accessibility support
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
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 min-h-[64px]',
        onClick && 'cursor-pointer active:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
        className
      )}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (ariaLabel || title) : undefined}
    >
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
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
        <div className="flex-shrink-0 text-base font-semibold">
          {value}
        </div>
      )}

      {action ? (
        <div className="flex-shrink-0">{action}</div>
      ) : onClick ? (
        <ChevronRight className="flex-shrink-0 h-5 w-5 text-muted-foreground" aria-hidden="true" />
      ) : null}
    </div>
  );
}

/**
 * Mobile-optimized stat card
 */
export function MobileStatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  onClick,
  className,
}: {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <MobileCard
      onClick={onClick}
      interactive={!!onClick}
      className={className}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl md:text-3xl font-bold">{value}</p>
            {trendValue && (
              <p
                className={cn(
                  'text-sm font-medium',
                  trend === 'up' && 'text-green-600',
                  trend === 'down' && 'text-red-600',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trendValue}
              </p>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </MobileCard>
  );
}

/**
 * Mobile-optimized expandable card
 * Includes keyboard accessibility support
 */
export function MobileExpandableCard({
  title,
  subtitle,
  children,
  defaultExpanded = false,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
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
    <MobileCard className={className}>
      <CardHeader
        className="cursor-pointer p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        id={headerId}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-base md:text-lg">{title}</CardTitle>
            {subtitle && (
              <CardDescription className="text-sm">{subtitle}</CardDescription>
            )}
          </div>
          <ChevronRight
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform',
              isExpanded && 'rotate-90'
            )}
            aria-hidden="true"
          />
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent
          className="p-4 pt-0"
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

