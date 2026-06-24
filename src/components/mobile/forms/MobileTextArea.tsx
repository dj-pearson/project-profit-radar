import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type TextareaHTMLAttributes,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export interface MobileTextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  /** Max characters — when provided, a live counter is shown. */
  maxLength?: number;
}

/**
 * Glass-surfaced multi-line mobile textarea with floating label, character
 * counter, and accessible error state.
 */
export const MobileTextArea = forwardRef<HTMLTextAreaElement, MobileTextAreaProps>(
  function MobileTextArea(
    {
      label,
      helper,
      error,
      required,
      className,
      id: idProp,
      value,
      defaultValue,
      maxLength,
      rows = 4,
      onFocus,
      onBlur,
      onChange,
      disabled,
      ...rest
    },
    ref,
  ) {
    const reactId = useId();
    const id = idProp ?? reactId;
    const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
    const [focused, setFocused] = useState(false);
    const [internalLen, setInternalLen] = useState(() => {
      const v = (value ?? defaultValue ?? '') as string;
      return typeof v === 'string' ? v.length : 0;
    });
    const haptics = useHaptics();
    const reduceMotion = useReducedMotion();

    useEffect(() => {
      if (typeof value === 'string') setInternalLen(value.length);
    }, [value]);

    const shakeKey = useRef(0);
    const lastError = useRef<string | undefined>(undefined);
    useEffect(() => {
      if (error && error !== lastError.current) {
        shakeKey.current += 1;
        haptics.error();
      }
      lastError.current = error;
    }, [error, haptics]);

    const floating = focused || internalLen > 0;

    return (
      <div className={cn('w-full', className)}>
        <motion.div
          key={shakeKey.current}
          animate={
            error && !reduceMotion ? { x: [0, -6, 6, -4, 4, 0] } : undefined
          }
          transition={{ duration: 0.32, ease: 'easeInOut' }}
          className={cn(
            'relative rounded-xl glass-thin',
            'transition-all duration-[180ms] ease-ios',
            focused && !error && 'ring-2 ring-primary/60 shadow-ios-2',
            error && 'ring-2 ring-destructive/70',
            disabled && 'opacity-60',
          )}
        >
          <label
            htmlFor={id}
            className={cn(
              'absolute left-4 pointer-events-none origin-left',
              'text-muted-foreground',
              'transition-all duration-[200ms] ease-ios',
              floating
                ? 'top-1.5 text-[11px] font-medium uppercase tracking-wide'
                : 'top-5 text-base',
              focused && !error && 'text-primary',
              error && 'text-destructive',
            )}
          >
            {label}
            {required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
          </label>

          <textarea
            ref={ref}
            id={id}
            value={value}
            defaultValue={defaultValue}
            rows={rows}
            maxLength={maxLength}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            disabled={disabled}
            onFocus={(e: FocusEvent<HTMLTextAreaElement>) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e: FocusEvent<HTMLTextAreaElement>) => {
              setFocused(false);
              setInternalLen(e.currentTarget.value.length);
              onBlur?.(e);
            }}
            onChange={(e) => {
              setInternalLen(e.currentTarget.value.length);
              onChange?.(e);
            }}
            className={cn(
              'w-full bg-transparent outline-none resize-y',
              'pt-7 pb-3 px-4 min-h-[96px]',
              'text-base leading-relaxed tracking-tight',
              'tap-highlight-transparent',
            )}
            {...rest}
          />

          {error && (
            <div className="absolute right-3 top-3 flex items-center">
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            </div>
          )}
        </motion.div>

        <div className="flex items-start justify-between gap-3 mt-1.5 px-1">
          {(error || helper) ? (
            <p
              id={describedBy}
              className={cn(
                'text-xs leading-snug flex-1',
                error ? 'text-destructive' : 'text-muted-foreground',
              )}
              role={error ? 'alert' : undefined}
            >
              {error ?? helper}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}
          {maxLength && (
            <span
              aria-live="polite"
              className={cn(
                'text-[11px] tabular-nums flex-shrink-0',
                internalLen > maxLength * 0.9
                  ? 'text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              {internalLen}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);
