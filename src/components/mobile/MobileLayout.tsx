import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  withPadding?: boolean;
  withBottomNav?: boolean;
}

/**
 * Mobile-first layout wrapper with safe areas and proper spacing
 */
export function MobileLayout({
  children,
  className,
  withPadding = true,
  withBottomNav = false,
}: MobileLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'w-full min-h-screen',
        withPadding && 'px-4 py-4 md:px-6 md:py-6',
        withBottomNav && 'pb-20 md:pb-6', // Extra padding for bottom nav on mobile
        'safe-area-inset',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Mobile-optimized container with max-width
 */
export function MobileContainer({
  children,
  className,
  size = 'full',
}: {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
}) {
  const maxWidths = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn('w-full mx-auto', maxWidths[size], className)}>
      {children}
    </div>
  );
}

/**
 * Mobile-optimized section with spacing
 */
export function MobileSection({
  children,
  className,
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className={cn('space-y-4 md:space-y-6', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          )}
          {description && (
            <p className="text-sm md:text-base text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Mobile-optimized grid layout
 */
export function MobileGrid({
  children,
  className,
  cols = 1,
}: {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4 md:gap-6', gridCols[cols], className)}>
      {children}
    </div>
  );
}

/**
 * Mobile-optimized stack layout
 */
export function MobileStack({
  children,
  className,
  spacing = 'md',
}: {
  children: ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}) {
  const spacings = {
    sm: 'space-y-2 md:space-y-3',
    md: 'space-y-4 md:space-y-6',
    lg: 'space-y-6 md:space-y-8',
  };

  return <div className={cn(spacings[spacing], className)}>{children}</div>;
}
