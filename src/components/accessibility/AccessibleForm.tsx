/**
 * AccessibleForm Components
 *
 * A collection of accessible form components compliant with WCAG 2.1 Level AA.
 *
 * Features:
 * - Proper label associations
 * - aria-invalid for error states
 * - aria-required for required fields
 * - aria-describedby for error messages and help text
 * - Live region announcements for validation errors
 * - Proper focus management on form submission errors
 *
 * Usage:
 * <AccessibleForm onSubmit={handleSubmit}>
 *   <AccessibleFormField
 *     name="email"
 *     label="Email Address"
 *     required
 *     type="email"
 *     error={errors.email}
 *     helpText="We'll never share your email"
 *   />
 *   <AccessibleFormField
 *     name="password"
 *     label="Password"
 *     required
 *     type="password"
 *     error={errors.password}
 *   />
 *   <AccessibleSubmitButton>Sign In</AccessibleSubmitButton>
 * </AccessibleForm>
 */

import React, { useRef, useEffect, useState, useCallback, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

// Form Context for managing form-wide state
interface FormContextValue {
  formId: string;
  errors: Record<string, string | undefined>;
  setErrors: (errors: Record<string, string | undefined>) => void;
  registerField: (name: string) => void;
  unregisterField: (name: string) => void;
}

const FormContext = createContext<FormContextValue | null>(null);

// Hook to use form context
const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('Form components must be used within AccessibleForm');
  }
  return context;
};

// Generate unique ID
const generateId = () => `form-${Math.random().toString(36).substr(2, 9)}`;

/**
 * AccessibleForm - Form wrapper with accessibility features
 */
export interface AccessibleFormProps {
  children: React.ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
  /** Form label for screen readers */
  ariaLabel?: string;
  /** ID of element describing the form */
  ariaDescribedBy?: string;
  /** Whether to focus first error field on submit */
  focusFirstError?: boolean;
  /** Initial errors */
  initialErrors?: Record<string, string | undefined>;
}

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  children,
  onSubmit,
  className,
  ariaLabel,
  ariaDescribedBy,
  focusFirstError = true,
  initialErrors = {},
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [formId] = useState(generateId);
  const [errors, setErrors] = useState<Record<string, string | undefined>>(initialErrors);
  const [fields, setFields] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState<string>('');

  const registerField = useCallback((name: string) => {
    setFields(prev => new Set([...prev, name]));
  }, []);

  const unregisterField = useCallback((name: string) => {
    setFields(prev => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Check for errors
    const errorCount = Object.values(errors).filter(Boolean).length;
    if (errorCount > 0 && focusFirstError && formRef.current) {
      // Find first field with error
      const firstErrorField = Object.keys(errors).find(key => errors[key]);
      if (firstErrorField) {
        const field = formRef.current.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
        if (field) {
          field.focus();
          setAnnouncement(`Form has ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}. ${errors[firstErrorField]}`);
        }
      }
      return;
    }

    onSubmit?.(event);
  }, [errors, focusFirstError, onSubmit]);

  // Update errors when initialErrors change
  useEffect(() => {
    setErrors(initialErrors);
  }, [initialErrors]);

  return (
    <FormContext.Provider value={{ formId, errors, setErrors, registerField, unregisterField }}>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={className}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        noValidate
      >
        {children}
      </form>
    </FormContext.Provider>
  );
};

/**
 * AccessibleFormField - Individual form field with accessibility features
 */
export interface AccessibleFormFieldProps {
  /** Field name (used for form data and error association) */
  name: string;
  /** Field label */
  label: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'search' | 'date' | 'time' | 'datetime-local';
  /** Whether the field is required */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Help text displayed below the input */
  helpText?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Input value */
  value?: string | number;
  /** Default value */
  defaultValue?: string | number;
  /** Change handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Blur handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Additional class names for the wrapper */
  className?: string;
  /** Additional class names for the input */
  inputClassName?: string;
  /** Auto-complete attribute */
  autoComplete?: string;
  /** Pattern for validation */
  pattern?: string;
  /** Minimum value (for number inputs) */
  min?: number | string;
  /** Maximum value (for number inputs) */
  max?: number | string;
  /** Step value (for number inputs) */
  step?: number | string;
  /** Minimum length */
  minLength?: number;
  /** Maximum length */
  maxLength?: number;
  /** Whether to hide the label visually (still accessible) */
  hideLabel?: boolean;
  /** Custom input render (for advanced cases) */
  renderInput?: (props: InputRenderProps) => React.ReactNode;
}

interface InputRenderProps {
  id: string;
  name: string;
  'aria-invalid': boolean;
  'aria-required': boolean;
  'aria-describedby': string | undefined;
  disabled: boolean;
  className: string;
}

export const AccessibleFormField: React.FC<AccessibleFormFieldProps> = ({
  name,
  label,
  type = 'text',
  required = false,
  error,
  helpText,
  placeholder,
  disabled = false,
  value,
  defaultValue,
  onChange,
  onBlur,
  className,
  inputClassName,
  autoComplete,
  pattern,
  min,
  max,
  step,
  minLength,
  maxLength,
  hideLabel = false,
  renderInput,
}) => {
  const { formId, registerField, unregisterField } = useFormContext();
  const inputId = `${formId}-${name}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  // Register/unregister field
  useEffect(() => {
    registerField(name);
    return () => unregisterField(name);
  }, [name, registerField, unregisterField]);

  // Build aria-describedby
  const describedByParts: string[] = [];
  if (error) describedByParts.push(errorId);
  if (helpText) describedByParts.push(helpId);
  const ariaDescribedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  const hasError = Boolean(error);

  const inputProps: InputRenderProps = {
    id: inputId,
    name,
    'aria-invalid': hasError,
    'aria-required': required,
    'aria-describedby': ariaDescribedBy,
    disabled,
    className: cn(
      'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      hasError && 'border-destructive focus:ring-destructive',
      !hasError && 'border-input',
      inputClassName
    ),
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <label
        htmlFor={inputId}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          hideLabel && 'sr-only'
        )}
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>

      {/* Input or custom render */}
      {renderInput ? (
        renderInput(inputProps)
      ) : (
        <input
          {...inputProps}
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          pattern={pattern}
          min={min}
          max={max}
          step={step}
          minLength={minLength}
          maxLength={maxLength}
        />
      )}

      {/* Help text */}
      {helpText && !error && (
        <p id={helpId} className="text-sm text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" aria-hidden="true" />
          {helpText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * AccessibleTextarea - Accessible textarea component
 */
export interface AccessibleTextareaProps {
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  className?: string;
  textareaClassName?: string;
  rows?: number;
  minLength?: number;
  maxLength?: number;
  hideLabel?: boolean;
}

export const AccessibleTextarea: React.FC<AccessibleTextareaProps> = ({
  name,
  label,
  required = false,
  error,
  helpText,
  placeholder,
  disabled = false,
  value,
  defaultValue,
  onChange,
  onBlur,
  className,
  textareaClassName,
  rows = 3,
  minLength,
  maxLength,
  hideLabel = false,
}) => {
  const { formId, registerField, unregisterField } = useFormContext();
  const textareaId = `${formId}-${name}`;
  const errorId = `${textareaId}-error`;
  const helpId = `${textareaId}-help`;

  useEffect(() => {
    registerField(name);
    return () => unregisterField(name);
  }, [name, registerField, unregisterField]);

  const describedByParts: string[] = [];
  if (error) describedByParts.push(errorId);
  if (helpText) describedByParts.push(helpId);
  const ariaDescribedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  const hasError = Boolean(error);

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={textareaId}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          hideLabel && 'sr-only'
        )}
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>

      <textarea
        id={textareaId}
        name={name}
        aria-invalid={hasError}
        aria-required={required}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        rows={rows}
        minLength={minLength}
        maxLength={maxLength}
        className={cn(
          'flex w-full rounded-md border bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-destructive focus:ring-destructive',
          !hasError && 'border-input',
          textareaClassName
        )}
      />

      {helpText && !error && (
        <p id={helpId} className="text-sm text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" aria-hidden="true" />
          {helpText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * AccessibleSelect - Accessible select component
 */
export interface AccessibleSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface AccessibleSelectProps {
  name: string;
  label: string;
  options: AccessibleSelectOption[];
  required?: boolean;
  error?: string;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLSelectElement>) => void;
  className?: string;
  selectClassName?: string;
  hideLabel?: boolean;
}

export const AccessibleSelect: React.FC<AccessibleSelectProps> = ({
  name,
  label,
  options,
  required = false,
  error,
  helpText,
  placeholder,
  disabled = false,
  value,
  defaultValue,
  onChange,
  onBlur,
  className,
  selectClassName,
  hideLabel = false,
}) => {
  const { formId, registerField, unregisterField } = useFormContext();
  const selectId = `${formId}-${name}`;
  const errorId = `${selectId}-error`;
  const helpId = `${selectId}-help`;

  useEffect(() => {
    registerField(name);
    return () => unregisterField(name);
  }, [name, registerField, unregisterField]);

  const describedByParts: string[] = [];
  if (error) describedByParts.push(errorId);
  if (helpText) describedByParts.push(helpId);
  const ariaDescribedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  const hasError = Boolean(error);

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={selectId}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          hideLabel && 'sr-only'
        )}
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>

      <select
        id={selectId}
        name={name}
        aria-invalid={hasError}
        aria-required={required}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        className={cn(
          'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-destructive focus:ring-destructive',
          !hasError && 'border-input',
          selectClassName
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      {helpText && !error && (
        <p id={helpId} className="text-sm text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" aria-hidden="true" />
          {helpText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * AccessibleFieldset - Group related form fields
 */
export interface AccessibleFieldsetProps {
  legend: string;
  children: React.ReactNode;
  className?: string;
  hideLegend?: boolean;
  error?: string;
}

export const AccessibleFieldset: React.FC<AccessibleFieldsetProps> = ({
  legend,
  children,
  className,
  hideLegend = false,
  error,
}) => {
  return (
    <fieldset
      className={cn('space-y-4', className)}
      aria-invalid={Boolean(error)}
    >
      <legend className={cn('text-sm font-medium', hideLegend && 'sr-only')}>
        {legend}
      </legend>
      {children}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  );
};

/**
 * AccessibleFormStatus - Display form submission status
 */
export interface AccessibleFormStatusProps {
  status: 'idle' | 'submitting' | 'success' | 'error';
  successMessage?: string;
  errorMessage?: string;
  className?: string;
}

export const AccessibleFormStatus: React.FC<AccessibleFormStatusProps> = ({
  status,
  successMessage = 'Form submitted successfully',
  errorMessage = 'There was an error submitting the form',
  className,
}) => {
  if (status === 'idle') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center gap-2 p-3 rounded-md', className, {
        'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200': status === 'success',
        'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200': status === 'error',
        'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200': status === 'submitting',
      })}
    >
      {status === 'success' && (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>{successMessage}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>{errorMessage}</span>
        </>
      )}
      {status === 'submitting' && (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          <span>Submitting...</span>
        </>
      )}
    </div>
  );
};

export default AccessibleForm;
