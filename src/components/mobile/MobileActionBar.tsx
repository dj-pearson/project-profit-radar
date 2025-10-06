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
        'p-4 bg-background/95 backdrop-blur-sm border-t',
        'md:hidden', // Only show on mobile
        'z-50',
        'safe-area-inset-bottom', // Account for iPhone notch
        className
      )}
    >
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
      className="w-full h-12 text-base"
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
