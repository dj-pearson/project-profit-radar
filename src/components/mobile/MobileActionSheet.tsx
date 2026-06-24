import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { preventBodyScroll } from '@/lib/mobile-utils';
import { useHaptics } from '@/hooks/useHaptics';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Frosted-glass mobile action sheet that slides up from the bottom
 * with an iOS-style spring curve. Scrim uses blur + translucent fill.
 */
export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
}: MobileActionSheetProps) {
  const haptics = useHaptics();
  useEffect(() => {
    preventBodyScroll(isOpen);
    return () => preventBodyScroll(false);
  }, [isOpen]);

  const handleClose = () => {
    haptics.impactLight();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 ios-scrim z-50 ios-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Action sheet'}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'glass-thick rounded-t-[28px]',
          'max-h-[90vh] overflow-hidden',
          'ios-sheet-in',
          'safe-area-x',
          className
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
          <div className="sheet-grabber" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 dark:border-white/5">
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-9 w-9 p-0 rounded-full"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-4rem)] p-4">
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * Action sheet menu item — iOS-style full-width row with subtle press state.
 */
export function MobileActionSheetItem({
  icon,
  label,
  onClick,
  variant = 'default',
  className,
}: {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  className?: string;
}) {
  const haptics = useHaptics();
  return (
    <button
      type="button"
      onClick={() => {
        haptics.selection();
        onClick();
      }}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl',
        'text-left min-h-[56px] tap-highlight-transparent',
        'transition-colors duration-[150ms] ease-ios',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'active:scale-[0.985]',
        variant === 'default' && 'hover:bg-foreground/5 active:bg-foreground/10',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10 active:bg-destructive/15',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
            variant === 'destructive'
              ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/15'
              : 'bg-foreground/5 text-foreground ring-1 ring-foreground/10'
          )}
        >
          {icon}
        </div>
      )}
      <span className="text-base font-medium">{label}</span>
    </button>
  );
}

/**
 * Action sheet with predefined actions
 */
export function MobileActionMenu({
  isOpen,
  onClose,
  actions,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  actions: Array<{
    icon?: ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }>;
  title?: string;
}) {
  return (
    <MobileActionSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-1">
        {actions.map((action, index) => (
          <MobileActionSheetItem
            key={index}
            icon={action.icon}
            label={action.label}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            variant={action.variant}
          />
        ))}
      </div>
    </MobileActionSheet>
  );
}
