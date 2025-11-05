import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

/**
 * Mobile-optimized card with larger touch targets
 */
export function MobileCard({
  children,
  className,
  onClick,
  interactive = false,
}: MobileCardProps) {
  return (
    <Card
      className={cn(
        'border rounded-lg',
        onClick || interactive
          ? 'cursor-pointer active:scale-[0.98] transition-transform'
          : '',
        className
      )}
      onClick={onClick}
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
}

/**
 * Mobile-optimized list card item
 */
export function MobileCardItem({
  title,
  subtitle,
  value,
  icon,
  onClick,
  action,
  className,
}: MobileCardItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 min-h-[64px]',
        onClick && 'cursor-pointer active:bg-muted/50 transition-colors',
        className
      )}
      onClick={onClick}
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
        <ChevronRight className="flex-shrink-0 h-5 w-5 text-muted-foreground" />
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

  return (
    <MobileCard className={className}>
      <CardHeader
        className="cursor-pointer p-4"
        onClick={() => setIsExpanded(!isExpanded)}
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
          />
        </div>
      </CardHeader>
      {isExpanded && <CardContent className="p-4 pt-0">{children}</CardContent>}
    </MobileCard>
  );
}

import React from 'react';
