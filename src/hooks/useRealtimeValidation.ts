import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

export interface ValidationState {
  isValid: boolean;
  isPristine: boolean;
  errors: string[];
  warnings: string[];
}

interface UseRealtimeValidationOptions<T> {
  /**
   * Zod schema to validate against
   */
  schema: z.ZodSchema<T>;

  /**
   * Value to validate
   */
  value: T;

  /**
   * Delay before validation (debounce in ms)
   * Default: 300ms
   */
  debounceMs?: number;

  /**
   * Only validate after first blur
   * Default: false
   */
  validateOnBlurOnly?: boolean;

  /**
   * Custom validation function (runs after schema validation)
   */
  customValidator?: (value: T) => Promise<string[]> | string[];

  /**
   * Warning validation (non-blocking suggestions)
   */
  warningValidator?: (value: T) => string[];
}

/**
 * useRealtimeValidation - Real-time form field validation with debouncing
 *
 * Provides immediate feedback to users as they type, with smart debouncing
 * to avoid validation spam.
 *
 * @example
 * ```tsx
 * const emailSchema = z.string().email();
 * const validation = useRealtimeValidation({
 *   schema: emailSchema,
 *   value: email,
 *   debounceMs: 300,
 * });
 *
 * return (
 *   <div>
 *     <Input
 *       value={email}
 *       onChange={(e) => setEmail(e.target.value)}
 *       onBlur={validation.markAsTouched}
 *       className={validation.isValid ? '' : 'border-red-500'}
 *     />
 *     {validation.errors.map(err => (
 *       <p className="text-red-500 text-sm">{err}</p>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useRealtimeValidation<T>({
  schema,
  value,
  debounceMs = 300,
  validateOnBlurOnly = false,
  customValidator,
  warningValidator,
}: UseRealtimeValidationOptions<T>) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    isPristine: true,
    errors: [],
    warnings: [],
  });

  const [isTouched, setIsTouched] = useState(false);

  // Validation logic
  const validate = useCallback(async () => {
    // Don't validate if pristine and validateOnBlurOnly is true
    if (validateOnBlurOnly && !isTouched) {
      return;
    }

    try {
      // Zod schema validation
      schema.parse(value);

      // Custom validation
      const customErrors = customValidator
        ? await Promise.resolve(customValidator(value))
        : [];

      // Warning validation
      const warnings = warningValidator ? warningValidator(value) : [];

      setValidationState({
        isValid: customErrors.length === 0,
        isPristine: false,
        errors: customErrors,
        warnings,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => err.message);
        const warnings = warningValidator ? warningValidator(value) : [];

        setValidationState({
          isValid: false,
          isPristine: false,
          errors,
          warnings,
        });
      }
    }
  }, [schema, value, isTouched, validateOnBlurOnly, customValidator, warningValidator]);

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      validate();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, validate, debounceMs]);

  // Mark as touched (typically on blur)
  const markAsTouched = useCallback(() => {
    setIsTouched(true);
  }, []);

  // Reset validation state
  const reset = useCallback(() => {
    setValidationState({
      isValid: true,
      isPristine: true,
      errors: [],
      warnings: [],
    });
    setIsTouched(false);
  }, []);

  return {
    ...validationState,
    markAsTouched,
    reset,
    isTouched,
  };
}

/**
 * useFormValidation - Multi-field form validation
 *
 * Validates an entire form with multiple fields and provides
 * aggregated validation state.
 *
 * @example
 * ```tsx
 * const validation = useFormValidation({
 *   fields: {
 *     email: {
 *       schema: z.string().email(),
 *       value: formData.email,
 *     },
 *     password: {
 *       schema: z.string().min(8),
 *       value: formData.password,
 *     },
 *   },
 * });
 *
 * const handleSubmit = () => {
 *   if (!validation.isFormValid) return;
 *   // Submit form
 * };
 * ```
 */
export function useFormValidation<T extends Record<string, any>>({
  fields,
  debounceMs = 300,
}: {
  fields: {
    [K in keyof T]: {
      schema: z.ZodSchema<T[K]>;
      value: T[K];
      customValidator?: (value: T[K]) => Promise<string[]> | string[];
    };
  };
  debounceMs?: number;
}) {
  const [fieldStates, setFieldStates] = useState<
    Record<string, ValidationState>
  >({});

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Validate all fields
  const validateAllFields = useCallback(async () => {
    const newStates: Record<string, ValidationState> = {};

    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      try {
        fieldConfig.schema.parse(fieldConfig.value);

        const customErrors = fieldConfig.customValidator
          ? await Promise.resolve(fieldConfig.customValidator(fieldConfig.value))
          : [];

        newStates[fieldName] = {
          isValid: customErrors.length === 0,
          isPristine: !touchedFields.has(fieldName),
          errors: customErrors,
          warnings: [],
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          newStates[fieldName] = {
            isValid: false,
            isPristine: !touchedFields.has(fieldName),
            errors: error.errors.map(err => err.message),
            warnings: [],
          };
        }
      }
    }

    setFieldStates(newStates);
  }, [fields, touchedFields]);

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      validateAllFields();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [fields, validateAllFields, debounceMs]);

  // Mark field as touched
  const markFieldAsTouched = useCallback((fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  }, []);

  // Check if entire form is valid
  const isFormValid = Object.values(fieldStates).every(state => state.isValid);

  // Get all form errors
  const formErrors = Object.entries(fieldStates)
    .filter(([_, state]) => !state.isValid)
    .map(([field, state]) => ({
      field,
      errors: state.errors,
    }));

  return {
    fieldStates,
    isFormValid,
    formErrors,
    markFieldAsTouched,
    validateAllFields,
  };
}
