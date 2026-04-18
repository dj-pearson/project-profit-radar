import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Sticky action bar for mobile devices
 * Positions primary action at bottom for thumb reach
 */
export function MobileActionBar({ children, className }: MobileActionBarProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0',
        'p-4 glass-chrome border-t border-white/10 dark:border-white/5',
        'md:hidden',
        'z-50 safe-area-x',
        className
      )}
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

interface MobileActionButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
  disabled?: boolean;
}

export function MobileActionButton({
  onClick,
  children,
  variant = 'default',
  disabled,
}: MobileActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      disabled={disabled}
      size="lg"
      className={cn(
        'w-full h-12 text-base rounded-xl font-semibold tracking-tight',
        'transition-all duration-[180ms] ease-ios active:scale-[0.98] tap-highlight-transparent',
        variant === 'default' && 'shadow-ios-2 hover:shadow-ios-3'
      )}
    >
      {children}
    </Button>
  );
}

/**
 * Wrapper to add padding for mobile action bar
 */
export function MobileActionBarWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20 md:pb-0">
      {children}
    </div>
  );
}
