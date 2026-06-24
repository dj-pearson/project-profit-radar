import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type SelectHTMLAttributes,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export interface MobileSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MobileSelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'children'> {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  options: MobileSelectOption[];
  /** Placeholder shown when no value is selected. */
  placeholder?: string;
}

/**
 * Native-select-backed mobile picker wrapped in a glass surface with
 * floating label. Uses the native iOS wheel picker for familiarity.
 */
export const MobileSelectField = forwardRef<HTMLSelectElement, MobileSelectFieldProps>(
  function MobileSelectField(
    {
      label,
      helper,
      error,
      required,
      options,
      placeholder,
      className,
      id: idProp,
      value,
      defaultValue,
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
    const [hasValue, setHasValue] = useState(
      () => Boolean(value ?? defaultValue ?? ''),
    );
    const haptics = useHaptics();
    const reduceMotion = useReducedMotion();

    useEffect(() => {
      if (value === undefined) return;
      setHasValue(typeof value === 'string' ? value.length > 0 : Boolean(value));
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

    const floating = focused || hasValue;

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
                : 'top-1/2 -translate-y-1/2 text-base',
              focused && !error && 'text-primary',
              error && 'text-destructive',
            )}
          >
            {label}
            {required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
          </label>

          <select
            ref={ref}
            id={id}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            onFocus={(e: FocusEvent<HTMLSelectElement>) => {
              setFocused(true);
              haptics.selection();
              onFocus?.(e);
            }}
            onBlur={(e: FocusEvent<HTMLSelectElement>) => {
              setFocused(false);
              setHasValue(e.currentTarget.value.length > 0);
              onBlur?.(e);
            }}
            onChange={(e) => {
              setHasValue(e.currentTarget.value.length > 0);
              onChange?.(e);
            }}
            className={cn(
              'w-full appearance-none bg-transparent outline-none cursor-pointer',
              'min-h-[56px] pt-5 pb-2 px-4 pr-10',
              'text-base tracking-tight',
              'tap-highlight-transparent',
            )}
            {...rest}
          >
            {placeholder !== undefined && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {error ? (
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            ) : (
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-[180ms] ease-ios',
                  focused && 'rotate-180 text-primary',
                )}
                aria-hidden="true"
              />
            )}
          </div>
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
