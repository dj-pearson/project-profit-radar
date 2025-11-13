/**
 * Accessible Modal Component
 * WCAG 2.1 AA compliant with full keyboard navigation and screen reader support
 */

import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap, useAriaId, useEscapeKey, useClickOutside } from '@/hooks/useAccessibilityHelpers';
import { Button } from '@/components/ui/button';

interface AccessibleModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title (required for accessibility) */
  title: string;
  /** Modal content */
  children: ReactNode;
  /** Optional description */
  description?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Hide close button */
  hideCloseButton?: boolean;
  /** Disable click outside to close */
  disableClickOutside?: boolean;
  /** Disable escape key to close */
  disableEscapeKey?: boolean;
  /** Custom className for modal content */
  className?: string;
  /** Footer content */
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

/**
 * Fully accessible modal dialog component
 * Features:
 * - Focus trap
 * - Escape key to close
 * - Click outside to close
 * - Screen reader announcements
 * - Keyboard navigation
 * - Proper ARIA attributes
 */
export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  description,
  size = 'md',
  hideCloseButton = false,
  disableClickOutside = false,
  disableEscapeKey = false,
  className,
  footer,
}: AccessibleModalProps) {
  const modalRef = useFocusTrap(isOpen);
  const overlayRef = useClickOutside(onClose, isOpen && !disableClickOutside);
  const titleId = useAriaId('modal-title');
  const descriptionId = useAriaId('modal-description');
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEscapeKey(onClose, isOpen && !disableEscapeKey);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previouslyFocusedRef.current = document.activeElement as HTMLElement;

      // Lock body scroll
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollBarWidth}px`;

      return () => {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        // Return focus to previously focused element
        if (previouslyFocusedRef.current) {
          previouslyFocusedRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative z-50 w-full bg-background rounded-lg shadow-lg',
          'animate-in fade-in zoom-in-95 duration-200',
          'max-h-[90vh] flex flex-col',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex-1 pr-8">
            <h2
              id={titleId}
              className="text-xl font-semibold leading-none tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className="text-sm text-muted-foreground mt-2"
              >
                {description}
              </p>
            )}
          </div>

          {!hideCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-full"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/**
 * Example usage:
 *
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <AccessibleModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   description="This action cannot be undone."
 *   footer={
 *     <>
 *       <Button variant="outline" onClick={() => setIsOpen(false)}>
 *         Cancel
 *       </Button>
 *       <Button onClick={handleConfirm}>
 *         Confirm
 *       </Button>
 *     </>
 *   }
 * >
 *   Are you sure you want to proceed?
 * </AccessibleModal>
 * ```
 */
