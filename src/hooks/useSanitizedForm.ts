import { useState, useCallback, useMemo } from 'react';
import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeHtml,
  sanitizeSqlInput,
} from '@/lib/security/sanitize';

/**
 * Field sanitization types
 */
export type SanitizationType =
  | 'text'      // General text input - removes angle brackets, trims, limits length
  | 'email'     // Email - lowercase, trim, limit length
  | 'phone'     // Phone - allows numbers and phone characters only
  | 'html'      // Rich text - sanitizes HTML, removes XSS vectors
  | 'search'    // Search queries - removes SQL special characters
  | 'number'    // Numeric input - parses to number, validates range
  | 'none';     // No sanitization (use carefully)

/**
 * Field configuration for sanitization
 */
export interface FieldConfig {
  type?: SanitizationType;
  maxLength?: number;
  min?: number;
  max?: number;
  required?: boolean;
  pattern?: RegExp;
  customSanitizer?: (value: string) => string;
}

/**
 * Sanitization result for a single field
 */
export interface SanitizedValue<T> {
  value: T;
  isValid: boolean;
  error?: string;
}

/**
 * Form state with sanitization metadata
 */
export interface SanitizedFormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isValid: boolean;
  isDirty: boolean;
  touchedFields: Set<keyof T>;
}

/**
 * Options for the useSanitizedForm hook
 */
export interface UseSanitizedFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  fieldConfigs?: Partial<Record<keyof T, FieldConfig>>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * Sanitize a single value based on type
 */
export function sanitizeValue(
  value: string,
  type: SanitizationType = 'text',
  config: FieldConfig = {}
): string {
  let sanitized = value;

  switch (type) {
    case 'text':
      sanitized = sanitizeInput(value);
      break;
    case 'email':
      sanitized = sanitizeEmail(value);
      break;
    case 'phone':
      sanitized = sanitizePhone(value);
      break;
    case 'html':
      sanitized = sanitizeHtml(value);
      break;
    case 'search':
      sanitized = sanitizeSqlInput(value);
      break;
    case 'number':
      // Keep only digits, decimal point, and minus sign
      sanitized = value.replace(/[^\d.\-]/g, '').trim();
      break;
    case 'none':
      sanitized = value;
      break;
    default:
      sanitized = sanitizeInput(value);
  }

  // Apply custom sanitizer if provided
  if (config.customSanitizer) {
    sanitized = config.customSanitizer(sanitized);
  }

  // Apply max length if specified
  if (config.maxLength && sanitized.length > config.maxLength) {
    sanitized = sanitized.slice(0, config.maxLength);
  }

  return sanitized;
}

/**
 * Validate a single value based on config
 */
export function validateValue(
  value: unknown,
  config: FieldConfig = {}
): { isValid: boolean; error?: string } {
  const stringValue = String(value ?? '');

  // Required check
  if (config.required && !stringValue.trim()) {
    return { isValid: false, error: 'This field is required' };
  }

  // Pattern check
  if (config.pattern && stringValue && !config.pattern.test(stringValue)) {
    return { isValid: false, error: 'Invalid format' };
  }

  // Number range checks
  if (config.type === 'number' && stringValue) {
    const numValue = parseFloat(stringValue);
    if (isNaN(numValue)) {
      return { isValid: false, error: 'Must be a valid number' };
    }
    if (config.min !== undefined && numValue < config.min) {
      return { isValid: false, error: `Must be at least ${config.min}` };
    }
    if (config.max !== undefined && numValue > config.max) {
      return { isValid: false, error: `Must be at most ${config.max}` };
    }
  }

  return { isValid: true };
}

/**
 * Custom hook for form handling with automatic input sanitization
 *
 * @example
 * const { values, errors, handleChange, handleBlur, handleSubmit, isValid } = useSanitizedForm({
 *   initialValues: { name: '', email: '', phone: '' },
 *   fieldConfigs: {
 *     name: { type: 'text', required: true, maxLength: 100 },
 *     email: { type: 'email', required: true },
 *     phone: { type: 'phone' },
 *   },
 * });
 *
 * <input
 *   name="name"
 *   value={values.name}
 *   onChange={handleChange}
 *   onBlur={handleBlur}
 * />
 */
export function useSanitizedForm<T extends Record<string, unknown>>({
  initialValues,
  fieldConfigs = {},
  validateOnChange = true,
  validateOnBlur = true,
}: UseSanitizedFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof T>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  /**
   * Sanitize and set a single field value
   */
  const setFieldValue = useCallback(
    (field: keyof T, rawValue: unknown) => {
      const config = fieldConfigs[field] || {};
      const type = config.type || 'text';

      let sanitizedValue: unknown;

      if (typeof rawValue === 'string') {
        sanitizedValue = sanitizeValue(rawValue, type, config);
      } else if (type === 'number' && rawValue !== undefined) {
        sanitizedValue = rawValue;
      } else {
        sanitizedValue = rawValue;
      }

      setValues((prev) => ({ ...prev, [field]: sanitizedValue }));
      setIsDirty(true);

      // Validate on change if enabled
      if (validateOnChange) {
        const validation = validateValue(sanitizedValue, config);
        setErrors((prev) => ({
          ...prev,
          [field]: validation.error,
        }));
      }

      return sanitizedValue;
    },
    [fieldConfigs, validateOnChange]
  );

  /**
   * Handle input change event with automatic sanitization
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const field = name as keyof T;

      // Handle checkbox/radio differently
      if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFieldValue(field, checked);
        return;
      }

      if (type === 'number') {
        setFieldValue(field, value === '' ? '' : parseFloat(value));
        return;
      }

      setFieldValue(field, value);
    },
    [setFieldValue]
  );

  /**
   * Handle field blur for validation
   */
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const field = e.target.name as keyof T;

      setTouchedFields((prev) => new Set(prev).add(field));

      if (validateOnBlur) {
        const config = fieldConfigs[field] || {};
        const validation = validateValue(values[field], config);
        setErrors((prev) => ({
          ...prev,
          [field]: validation.error,
        }));
      }
    },
    [fieldConfigs, validateOnBlur, values]
  );

  /**
   * Validate all fields and return validation result
   */
  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const field of Object.keys(values) as Array<keyof T>) {
      const config = fieldConfigs[field] || {};
      const validation = validateValue(values[field], config);

      if (!validation.isValid) {
        newErrors[field] = validation.error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, fieldConfigs]);

  /**
   * Handle form submission with validation
   */
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return async (e?: React.FormEvent) => {
        if (e) {
          e.preventDefault();
        }

        // Mark all fields as touched
        setTouchedFields(new Set(Object.keys(values) as Array<keyof T>));

        if (validateAll()) {
          await onSubmit(values);
        }
      };
    },
    [values, validateAll]
  );

  /**
   * Reset form to initial values
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedFields(new Set());
    setIsDirty(false);
  }, [initialValues]);

  /**
   * Set multiple field values at once (with sanitization)
   */
  const setMultipleValues = useCallback(
    (newValues: Partial<T>) => {
      const sanitizedValues: Partial<T> = {};

      for (const [field, value] of Object.entries(newValues)) {
        const config = fieldConfigs[field as keyof T] || {};
        const type = config.type || 'text';

        if (typeof value === 'string') {
          sanitizedValues[field as keyof T] = sanitizeValue(value, type, config) as T[keyof T];
        } else {
          sanitizedValues[field as keyof T] = value as T[keyof T];
        }
      }

      setValues((prev) => ({ ...prev, ...sanitizedValues }));
      setIsDirty(true);
    },
    [fieldConfigs]
  );

  /**
   * Get field-specific error (only if touched)
   */
  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      return touchedFields.has(field) ? errors[field] : undefined;
    },
    [errors, touchedFields]
  );

  /**
   * Check if form is valid (memoized)
   */
  const isValid = useMemo(() => {
    return Object.values(errors).every((error) => !error);
  }, [errors]);

  /**
   * Get sanitized values (useful for submission)
   */
  const getSanitizedValues = useCallback((): T => {
    const sanitized: Partial<T> = {};

    for (const [field, value] of Object.entries(values)) {
      const config = fieldConfigs[field as keyof T] || {};
      const type = config.type || 'text';

      if (typeof value === 'string') {
        sanitized[field as keyof T] = sanitizeValue(value, type, config) as T[keyof T];
      } else {
        sanitized[field as keyof T] = value as T[keyof T];
      }
    }

    return sanitized as T;
  }, [values, fieldConfigs]);

  return {
    // State
    values,
    errors,
    isValid,
    isDirty,
    touchedFields,

    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,

    // Utilities
    setFieldValue,
    setMultipleValues,
    validateAll,
    reset,
    getFieldError,
    getSanitizedValues,
  };
}

/**
 * Helper hook for simple sanitized input
 * Use this for individual inputs outside of a form context
 *
 * @example
 * const [value, setValue, error] = useSanitizedInput('', { type: 'email', required: true });
 */
export function useSanitizedInput(
  initialValue: string = '',
  config: FieldConfig = {}
): [string, (value: string) => void, string | undefined] {
  const [value, setInternalValue] = useState(initialValue);
  const [error, setError] = useState<string | undefined>();

  const setValue = useCallback(
    (rawValue: string) => {
      const sanitized = sanitizeValue(rawValue, config.type || 'text', config);
      setInternalValue(sanitized);

      const validation = validateValue(sanitized, config);
      setError(validation.error);
    },
    [config]
  );

  return [value, setValue, error];
}

export default useSanitizedForm;
