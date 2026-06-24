import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export interface MobileTextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visible, accessible label (also used for aria-label fallback). */
  label: string;
  /** Optional inline helper text. Replaced by error when present. */
  helper?: string;
  /** Validation error. When set, triggers shake + error haptic + aria-invalid. */
  error?: string;
  /** Success confirmation (e.g., after async validation). */
  success?: boolean;
  /** Left-side decoration slot (lucide icon sized h-4 w-4). */
  leftIcon?: ReactNode;
  /** Right-side slot (e.g., clear / password-toggle button). */
  rightSlot?: ReactNode;
  /** Toggles the required asterisk on the floating label. */
  required?: boolean;
}

/**
 * Glass-surfaced mobile text input with an animated floating label,
 * 16px base font (prevents iOS auto-zoom), 44px hit target, and
 * accessible error/success states.
 *
 * Compatible with react-hook-form via forwardRef and standard value/onChange.
 */
export const MobileTextField = forwardRef<HTMLInputElement, MobileTextFieldProps>(
  function MobileTextField(
    {
      label,
      helper,
      error,
      success,
      leftIcon,
      rightSlot,
      required,
      className,
      id: idProp,
      value,
      defaultValue,
      onFocus,
      onBlur,
      disabled,
      placeholder,
      ...rest
    },
    ref,
  ) {
    const reactId = useId();
    const id = idProp ?? reactId;
    const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(
      () => Boolean(value ?? defaultValue ?? ''),
    );
    const haptics = useHaptics();
    const reduceMotion = useReducedMotion();

    // Track controlled value → floating label state
    useEffect(() => {
      if (value === undefined) return;
      setHasValue(typeof value === 'string' ? value.length > 0 : Boolean(value));
    }, [value]);

    // Shake + error haptic when `error` prop transitions truthy
    const shakeKey = useRef(0);
    const lastError = useRef<string | undefined>(undefined);
    useEffect(() => {
      if (error && error !== lastError.current) {
        shakeKey.current += 1;
        haptics.error();
      }
      lastError.current = error;
    }, [error, haptics]);

    const floating = focused || hasValue;

    return (
      <div className={cn('w-full', className)}>
        <motion.div
          key={shakeKey.current}
          animate={
            error && !reduceMotion
              ? { x: [0, -6, 6, -4, 4, 0] }
              : undefined
          }
          transition={{ duration: 0.32, ease: 'easeInOut' }}
          className={cn(
            'relative rounded-xl',
            'glass-thin',
            'transition-all duration-[180ms] ease-ios',
            focused && !error && 'ring-2 ring-primary/60 shadow-ios-2',
            error && 'ring-2 ring-destructive/70',
            success && !error && !focused && 'ring-1 ring-emerald-500/50',
            disabled && 'opacity-60',
          )}
        >
          {/* Floating label */}
          <label
            htmlFor={id}
            className={cn(
              'absolute left-4 pointer-events-none origin-left',
              'text-muted-foreground',
              'transition-all duration-[200ms] ease-ios',
              floating
                ? 'top-1.5 text-[11px] font-medium uppercase tracking-wide'
                : 'top-1/2 -translate-y-1/2 text-base',
              focused && !error && 'text-primary',
              error && 'text-destructive',
              leftIcon && !floating && 'left-11',
            )}
          >
            {label}
            {required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
          </label>

          {leftIcon && (
            <span
              className={cn(
                'absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center',
                'h-4 w-4 text-muted-foreground',
                focused && !error && 'text-primary',
                error && 'text-destructive',
              )}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            placeholder={floating ? placeholder : undefined}
            onFocus={(e: FocusEvent<HTMLInputElement>) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e: FocusEvent<HTMLInputElement>) => {
              setFocused(false);
              setHasValue(e.currentTarget.value.length > 0);
              onBlur?.(e);
            }}
            onChange={(e) => {
              setHasValue(e.currentTarget.value.length > 0);
              rest.onChange?.(e);
            }}
            className={cn(
              'w-full bg-transparent outline-none',
              'min-h-[56px] pt-5 pb-2 px-4',
              'text-base tracking-tight',
              'placeholder:text-muted-foreground/70',
              leftIcon && 'pl-11',
              rightSlot && 'pr-12',
              (error || success) && 'pr-12',
              'tap-highlight-transparent',
            )}
            {...rest}
          />

          {/* Right slot or validation glyph */}
          {(rightSlot || error || success) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {error ? (
                <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
              ) : success ? (
                <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              ) : (
                rightSlot
              )}
            </div>
          )}
        </motion.div>

        {(error || helper) && (
          <p
            id={describedBy}
            className={cn(
              'mt-1.5 px-1 text-xs leading-snug',
              error ? 'text-destructive' : 'text-muted-foreground',
            )}
            role={error ? 'alert' : undefined}
          >
            {error ?? helper}
          </p>
        )}
      </div>
    );
  },
);
