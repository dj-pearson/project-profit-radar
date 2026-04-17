import { useState, useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

/**
 * Mobile bottom sheet with swipe-to-dismiss, frosted-glass surface and
 * iOS-style spring motion. Honors prefers-reduced-motion.
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  className,
}: BottomSheetProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const haptics = useHaptics();

  const handleClose = () => {
    haptics.impact('medium');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const current = e.touches[0].clientY;
    setCurrentY(current);
  };

  const handleTouchEnd = () => {
    const distance = currentY - startY;

    if (distance > 100) {
      haptics.impact('medium');
      onClose();
    }

    setCurrentY(0);
    setStartY(0);
    setIsDragging(false);
  };

  if (!isOpen) return null;

  const translateY = isDragging && currentY > startY ? currentY - startY : 0;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 ios-scrim z-40 ios-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0',
          'glass-thick rounded-t-[28px]',
          'z-50 max-h-[88vh]',
          'ios-sheet-in',
          'safe-area-x',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom sheet'}
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle area (larger hit target) */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-manipulation"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-hidden="true"
        >
          <div className="sheet-grabber" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pb-4 border-b border-white/10 dark:border-white/5">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="p-2 rounded-full glass-interactive active:scale-95 transition-transform tap-highlight-transparent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Close button (if no title) */}
        {!title && (
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-4 top-4 p-2 rounded-full glass-interactive active:scale-95 transition-transform z-10 tap-highlight-transparent"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(88vh-4rem)]">
          {children}
        </div>
      </div>
    </>
  );
}
