import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { preventBodyScroll } from '@/lib/mobile-utils';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Mobile action sheet that slides up from bottom
 */
export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
}: MobileActionSheetProps) {
  useEffect(() => {
    preventBodyScroll(isOpen);
    return () => preventBodyScroll(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-background rounded-t-2xl',
          'max-h-[90vh] overflow-hidden',
          'animate-in slide-in-from-bottom duration-300',
          'safe-area-inset-bottom',
          className
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
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
 * Action sheet menu item
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
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-lg',
        'text-left transition-colors min-h-[56px]',
        'active:bg-muted/80',
        variant === 'default' && 'hover:bg-muted/50',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10',
        className
      )}
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
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
