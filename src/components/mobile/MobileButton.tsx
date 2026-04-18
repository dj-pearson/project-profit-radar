import { ReactNode, ButtonHTMLAttributes, MouseEvent as ReactMouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';

interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

/**
 * Mobile-optimized button with iOS press feedback, haptics and an
 * optional glassmorphic variant.
 */
export function MobileButton({
  children,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  loading = false,
  className,
  disabled,
  onClick,
  ...props
}: MobileButtonProps) {
  const haptics = useHaptics();
  const sizeClasses = {
    sm: 'h-10 px-4 text-sm rounded-xl',
    md: 'h-12 px-6 text-base rounded-xl',
    lg: 'h-14 px-8 text-lg rounded-2xl',
  };

  const isGlass = variant === 'glass';

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    if (variant === 'destructive') haptics.destructive();
    else haptics.impactLight();
    onClick?.(e);
  };

  return (
    <Button
      variant={isGlass ? 'ghost' : variant}
      disabled={disabled || loading}
      onClick={handleClick}
      className={cn(
        sizeClasses[size],
        fullWidth && 'w-full',
        'min-w-[44px] font-semibold tracking-tight',
        'transition-all duration-[180ms] ease-ios ios-press tap-highlight-transparent',
        isGlass && 'glass-interactive text-foreground hover:bg-transparent',
        variant === 'default' && 'shadow-ios-2 hover:shadow-ios-3',
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2 flex items-center">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2 flex items-center">{icon}</span>
      )}
    </Button>
  );
}

/**
 * Floating Action Button (FAB) for mobile with glass outer halo + solid
 * accent core, safe-area aware, and tactile press feedback.
 */
export function MobileFAB({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  className,
  extended,
  extendedLabel,
}: {
  icon: ReactNode;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
  /** Render as an extended pill FAB with a visible label. */
  extended?: boolean;
  extendedLabel?: string;
}) {
  const haptics = useHaptics();
  const positionClasses = {
    'bottom-right': 'right-4',
    'bottom-left': 'left-4',
    'bottom-center': 'left-1/2 -translate-x-1/2',
  };

  return (
    <button
      onClick={() => {
        haptics.impactMedium();
        onClick();
      }}
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
      className={cn(
        'fixed z-40 md:hidden',
        extended ? 'h-14 px-5 rounded-full' : 'w-14 h-14 rounded-full',
        'bg-gradient-to-br from-primary to-[hsl(24_100%_34%)] text-primary-foreground',
        'shadow-ios-glow',
        'ring-1 ring-white/25 ring-inset',
        'flex items-center justify-center gap-2 font-semibold',
        'transition-all duration-[200ms] ease-ios',
        'active:scale-[0.94] active:shadow-ios-2',
        'tap-highlight-transparent',
        positionClasses[position],
        className
      )}
      aria-label={label}
    >
      <span className="flex items-center justify-center">{icon}</span>
      {extended && extendedLabel && (
        <span className="text-sm">{extendedLabel}</span>
      )}
    </button>
  );
}

/**
 * Button group with mobile-optimized spacing
 */
export function MobileButtonGroup({
  children,
  orientation = 'horizontal',
  className,
}: {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-3',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Icon button optimized for mobile (glass-compatible).
 */
export function MobileIconButton({
  icon,
  label,
  onClick,
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'ghost' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const haptics = useHaptics();
  const sizeClasses = {
    sm: 'h-10 w-10 rounded-xl',
    md: 'h-12 w-12 rounded-xl',
    lg: 'h-14 w-14 rounded-2xl',
  };
  const isGlass = variant === 'glass';

  return (
    <Button
      variant={isGlass ? 'ghost' : variant}
      onClick={() => {
        haptics.selection();
        onClick?.();
      }}
      className={cn(
        sizeClasses[size],
        'p-0 flex-shrink-0',
        'transition-all duration-[180ms] ease-ios',
        'active:scale-90 tap-highlight-transparent',
        isGlass && 'glass-interactive',
        className
      )}
      aria-label={label}
      {...props}
    >
      {icon}
    </Button>
  );
}
