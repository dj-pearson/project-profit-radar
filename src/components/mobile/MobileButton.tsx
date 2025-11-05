import { ReactNode, ButtonHTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

/**
 * Mobile-optimized button with larger touch targets
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
  ...props
}: MobileButtonProps) {
  const sizeClasses = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-12 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
  };

  return (
    <Button
      variant={variant}
      disabled={disabled || loading}
      className={cn(
        sizeClasses[size],
        fullWidth && 'w-full',
        'min-w-[44px]', // Minimum touch target
        'active:scale-95 transition-transform',
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </Button>
  );
}

/**
 * Floating Action Button (FAB) for mobile
 */
export function MobileFAB({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  className,
}: {
  icon: ReactNode;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-40 md:hidden',
        'w-14 h-14 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg hover:shadow-xl',
        'flex items-center justify-center',
        'active:scale-95 transition-all',
        'safe-area-inset-bottom',
        positionClasses[position],
        className
      )}
      aria-label={label}
    >
      {icon}
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
 * Icon button optimized for mobile
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
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-14 w-14',
  };

  return (
    <Button
      variant={variant}
      onClick={onClick}
      className={cn(
        sizeClasses[size],
        'p-0 flex-shrink-0',
        'active:scale-90 transition-transform',
        className
      )}
      aria-label={label}
      {...props}
    >
      {icon}
    </Button>
  );
}
