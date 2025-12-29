import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { InputHTMLAttributes, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface MobileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  /** Whether this input should receive focus when the form loads */
  autoFocusOnMount?: boolean;
  /** Show success state when the field is valid */
  isValid?: boolean;
  /** Helper text to show below the input */
  helperText?: string;
}

/**
 * Mobile-optimized input field with proper touch targets, auto-focus, and validation feedback
 */
export function MobileInput({
  label,
  id,
  error,
  className,
  autoFocusOnMount,
  isValid,
  helperText,
  ...props
}: MobileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocusOnMount && inputRef.current) {
      // Small delay to ensure the keyboard appears smoothly on mobile
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocusOnMount]);

  const showError = error && error.length > 0;
  const showSuccess = isValid && !showError;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className={cn(
          'text-base font-medium',
          showError && 'text-destructive',
          showSuccess && 'text-green-600 dark:text-green-500'
        )}
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          className={cn(
            'h-12 text-base pr-10', // Larger for mobile, space for icon
            'touch-manipulation', // Optimize for touch
            showError && 'border-destructive focus-visible:ring-destructive',
            showSuccess && 'border-green-500 focus-visible:ring-green-500',
            className
          )}
          aria-invalid={showError ? 'true' : undefined}
          aria-describedby={showError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          {...props}
        />
        {/* Validation icon */}
        {(showError || showSuccess) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {showError ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
            )}
          </div>
        )}
      </div>
      {showError && (
        <p
          id={`${id}-error`}
          className="text-sm text-destructive flex items-center gap-1.5"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
      {helperText && !showError && (
        <p id={`${id}-helper`} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Email input with proper keyboard
 */
export function MobileEmailInput({ label, id, error, ...props }: MobileInputProps) {
  return (
    <MobileInput
      label={label}
      id={id}
      type="email"
      inputMode="email"
      autoComplete="email"
      error={error}
      {...props}
    />
  );
}

/**
 * Phone input with numeric keyboard
 */
export function MobilePhoneInput({ label, id, error, ...props }: MobileInputProps) {
  return (
    <MobileInput
      label={label}
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      error={error}
      {...props}
    />
  );
}

/**
 * Number input with numeric keyboard
 */
export function MobileNumberInput({ label, id, error, ...props }: MobileInputProps) {
  return (
    <MobileInput
      label={label}
      id={id}
      type="number"
      inputMode="numeric"
      error={error}
      {...props}
    />
  );
}

/**
 * Mobile-optimized textarea with validation feedback
 */
interface MobileTextareaProps {
  label: string;
  id: string;
  error?: string;
  className?: string;
  rows?: number;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isValid?: boolean;
  helperText?: string;
  autoFocusOnMount?: boolean;
}

export function MobileTextarea({
  label,
  id,
  error,
  className,
  rows = 4,
  isValid,
  helperText,
  autoFocusOnMount,
  ...props
}: MobileTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocusOnMount && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocusOnMount]);

  const showError = error && error.length > 0;
  const showSuccess = isValid && !showError;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className={cn(
          'text-base font-medium',
          showError && 'text-destructive',
          showSuccess && 'text-green-600 dark:text-green-500'
        )}
      >
        {label}
      </Label>
      <Textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        className={cn(
          'text-base resize-none touch-manipulation', // Larger text, disable resize on mobile
          showError && 'border-destructive focus-visible:ring-destructive',
          showSuccess && 'border-green-500 focus-visible:ring-green-500',
          className
        )}
        aria-invalid={showError ? 'true' : undefined}
        aria-describedby={showError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        {...props}
      />
      {showError && (
        <p
          id={`${id}-error`}
          className="text-sm text-destructive flex items-center gap-1.5"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
      {helperText && !showError && (
        <p id={`${id}-helper`} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Form wrapper with single-column layout, keyboard avoidance, and safe area support
 */
interface MobileFormWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Enable extra padding at the bottom for keyboard avoidance */
  keyboardAware?: boolean;
}

export function MobileFormWrapper({
  children,
  className,
  keyboardAware = true
}: MobileFormWrapperProps) {
  return (
    <div
      className={cn(
        'space-y-6 w-full max-w-md mx-auto',
        'px-4 py-6',
        'safe-area-x',
        keyboardAware && 'pb-32 md:pb-6', // Extra padding for mobile keyboard
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Mobile-optimized submit button with loading state
 */
interface MobileSubmitButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'submit' | 'button';
  onClick?: () => void;
}

export function MobileSubmitButton({
  children,
  isLoading,
  disabled,
  className,
  type = 'submit',
  onClick
}: MobileSubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(
        'w-full h-12 px-6',
        'bg-primary text-primary-foreground',
        'rounded-lg font-medium text-base',
        'touch-manipulation',
        'transition-all duration-150',
        'active:scale-[0.98] active:opacity-90',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        'flex items-center justify-center gap-2',
        className
      )}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
