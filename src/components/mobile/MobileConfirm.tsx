import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { AlertTriangle, X, type LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { preventBodyScroll } from '@/lib/mobile-utils';

export interface MobileConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  /** Primary title (bold, single line). */
  title: string;
  /** Supporting body copy. */
  description?: ReactNode;
  /** Optional icon badge (defaults to AlertTriangle when destructive). */
  icon?: LucideIcon;
  /** Destructive intent: uses red primary button + warning haptics. */
  destructive?: boolean;
  /** Primary button label. Defaults to 'Confirm' / 'Delete' when destructive. */
  confirmLabel?: string;
  /** Cancel button label. Defaults to 'Cancel'. */
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Disable the confirm button while async work is pending. */
  busy?: boolean;
}

/**
 * iOS-style modal confirmation dialog. Centered with glass surface,
 * stacked CTAs on narrow screens, focus-trapped, esc-to-close, with
 * semantic haptics on open/confirm.
 */
export function MobileConfirm({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  destructive = false,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  busy = false,
}: MobileConfirmProps) {
  const titleId = useId();
  const descId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActive = useRef<HTMLElement | null>(null);
  const haptics = useHaptics();

  useEffect(() => {
    preventBodyScroll(isOpen);
    return () => preventBodyScroll(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    previousActive.current = document.activeElement as HTMLElement | null;
    if (destructive) haptics.warning();
    else haptics.impact('light');

    // Focus trap: focus the confirm button on open
    const t = window.setTimeout(() => {
      const confirmBtn = containerRef.current?.querySelector<HTMLButtonElement>(
        '[data-confirm="true"]',
      );
      confirmBtn?.focus();
    }, 50);

    return () => {
      window.clearTimeout(t);
      previousActive.current?.focus();
    };
  }, [isOpen, destructive, haptics]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleConfirm = async () => {
    if (destructive) haptics.impact('heavy');
    else haptics.success();
    await onConfirm();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const IconComp = Icon ?? (destructive ? AlertTriangle : undefined);
  const primaryLabel = confirmLabel ?? (destructive ? 'Delete' : 'Confirm');

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
    >
      <div
        className="absolute inset-0 ios-scrim ios-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        className={cn(
          'relative w-full max-w-sm ios-scale-in',
          'glass-thick rounded-3xl shadow-ios-4',
          'p-6 text-center',
          'ring-1 ring-inset ring-white/30 dark:ring-white/10',
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center glass-interactive tap-highlight-transparent"
        >
          <X className="h-4 w-4" />
        </button>

        {IconComp && (
          <div
            className={cn(
              'mx-auto mb-3 flex items-center justify-center h-14 w-14 rounded-2xl shadow-ios-1',
              destructive
                ? 'bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20'
                : 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/15',
            )}
            aria-hidden="true"
          >
            <IconComp className="h-6 w-6" />
          </div>
        )}

        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <div
            id={descId}
            className="mt-1.5 text-sm text-muted-foreground leading-relaxed"
          >
            {description}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5">
          {cancelLabel && (
            <Button
              type="button"
              variant="ghost"
              className="flex-1 min-h-[48px] rounded-xl glass-interactive border border-white/20 dark:border-white/10 tap-highlight-transparent"
              onClick={onClose}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            data-confirm="true"
            variant={destructive ? 'destructive' : 'default'}
            className={cn(
              'flex-1 min-h-[48px] rounded-xl font-semibold tracking-tight tap-highlight-transparent',
              !destructive && 'shadow-ios-2',
              destructive && 'shadow-ios-2',
            )}
            disabled={busy}
            onClick={handleConfirm}
          >
            {busy ? 'Working…' : primaryLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
