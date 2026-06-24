import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { preventBodyScroll } from '@/lib/mobile-utils';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  position?: 'left' | 'right' | 'bottom';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

/**
 * Mobile drawer that slides in from side or bottom with frosted-glass
 * surface and iOS-style easing.
 */
export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  className,
  size = 'md',
}: MobileDrawerProps) {
  useEffect(() => {
    preventBodyScroll(isOpen);
    return () => preventBodyScroll(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: position === 'bottom' ? 'h-[50vh]' : 'w-[280px]',
    md: position === 'bottom' ? 'h-[70vh]' : 'w-[320px] md:w-[400px]',
    lg: position === 'bottom' ? 'h-[85vh]' : 'w-[90vw] md:w-[500px]',
    full: position === 'bottom' ? 'h-[95vh]' : 'w-full md:w-[600px]',
  };

  const positionClasses = {
    left: 'top-0 left-0 bottom-0 animate-in slide-in-from-left duration-300',
    right: 'top-0 right-0 bottom-0 animate-in slide-in-from-right duration-300',
    bottom: 'bottom-0 left-0 right-0 rounded-t-[28px] ios-sheet-in',
  };

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 ios-scrim z-50 ios-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed z-50 glass-thick',
          positionClasses[position],
          sizeClasses[size],
          'overflow-hidden flex flex-col',
          position === 'bottom' && 'safe-area-x',
          className
        )}
        style={
          position === 'bottom'
            ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
            : undefined
        }
      >
        {/* Drag handle for bottom drawer */}
        {position === 'bottom' && (
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0" aria-hidden="true">
            <div className="sheet-grabber" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 dark:border-white/5 flex-shrink-0">
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 p-0 rounded-full"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * Filter drawer specifically for mobile filtering
 */
export function MobileFilterDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <MobileDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      position="bottom"
      size="lg"
    >
      <div className="space-y-6">
        {children}

        <div className="flex gap-3 pt-4 border-t border-white/10 dark:border-white/5 sticky bottom-0 glass-chrome -mx-4 px-4 pb-2">
          <Button
            variant="outline"
            onClick={onReset}
            className="flex-1 h-12 rounded-xl"
          >
            Reset
          </Button>
          <Button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex-1 h-12 rounded-xl shadow-ios-2"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </MobileDrawer>
  );
}
