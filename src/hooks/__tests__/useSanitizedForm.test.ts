import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSanitizedForm,
  useSanitizedInput,
  sanitizeValue,
  validateValue,
  type FieldConfig,
} from '../useSanitizedForm';

describe('sanitizeValue', () => {
  describe('text sanitization', () => {
    it('trims whitespace from text', () => {
      expect(sanitizeValue('  hello  ', 'text')).toBe('hello');
    });

    it('removes angle brackets from text', () => {
      expect(sanitizeValue('<script>alert("xss")</script>', 'text')).toBe('scriptalert("xss")/script');
    });

    it('limits text length when maxLength is specified', () => {
      const result = sanitizeValue('hello world', 'text', { maxLength: 5 });
      expect(result).toBe('hello');
    });

    it('handles empty strings', () => {
      expect(sanitizeValue('', 'text')).toBe('');
    });
  });

  describe('email sanitization', () => {
    it('converts email to lowercase', () => {
      expect(sanitizeValue('USER@EXAMPLE.COM', 'email')).toBe('user@example.com');
    });

    it('trims whitespace from email', () => {
      expect(sanitizeValue('  user@example.com  ', 'email')).toBe('user@example.com');
    });
  });

  describe('phone sanitization', () => {
    it('preserves valid phone characters', () => {
      expect(sanitizeValue('+1 (555) 123-4567', 'phone')).toBe('+1 (555) 123-4567');
    });

    it('removes invalid characters from phone', () => {
      expect(sanitizeValue('555-CALL-NOW', 'phone')).toBe('555--');
    });
  });

  describe('html sanitization', () => {
    it('removes script tags', () => {
      const result = sanitizeValue('<script>alert("xss")</script><p>Hello</p>', 'html');
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('removes event handlers', () => {
      const result = sanitizeValue('<p onclick="alert(1)">Click</p>', 'html');
      expect(result).not.toContain('onclick');
    });
  });

  describe('search sanitization', () => {
    it('removes SQL special characters', () => {
      // sanitizeSqlInput removes ', ", and ; characters, then trims and limits to 100 chars
      expect(sanitizeValue("'; DROP TABLE users; --", 'search')).toBe('DROP TABLE users --');
    });

    it('limits length to 100 characters', () => {
      const longSearch = 'a'.repeat(150);
      expect(sanitizeValue(longSearch, 'search').length).toBe(100);
    });
  });

  describe('number sanitization', () => {
    it('removes non-numeric characters', () => {
      expect(sanitizeValue('abc123.45def', 'number')).toBe('123.45');
    });

    it('preserves negative numbers', () => {
      expect(sanitizeValue('-123.45', 'number')).toBe('-123.45');
    });
  });

  describe('none sanitization', () => {
    it('does not modify the value', () => {
      expect(sanitizeValue('<script>test</script>', 'none')).toBe('<script>test</script>');
    });
  });

  describe('custom sanitizer', () => {
    it('applies custom sanitizer function', () => {
      const config: FieldConfig = {
        customSanitizer: (v) => v.toUpperCase(),
      };
      expect(sanitizeValue('hello', 'text', config)).toBe('HELLO');
    });
  });
});

describe('validateValue', () => {
  it('returns valid for empty optional fields', () => {
    const result = validateValue('', {});
    expect(result.isValid).toBe(true);
  });

  it('returns error for empty required fields', () => {
    const result = validateValue('', { required: true });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('This field is required');
  });

  it('returns error for whitespace-only required fields', () => {
    const result = validateValue('   ', { required: true });
    expect(result.isValid).toBe(false);
  });

  it('validates pattern matching', () => {
    const zipPattern = /^\d{5}$/;
    expect(validateValue('12345', { pattern: zipPattern }).isValid).toBe(true);
    expect(validateValue('1234', { pattern: zipPattern }).isValid).toBe(false);
    expect(validateValue('abcde', { pattern: zipPattern }).isValid).toBe(false);
  });

  it('validates minimum value for numbers', () => {
    const result = validateValue('5', { type: 'number', min: 10 });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Must be at least 10');
  });

  it('validates maximum value for numbers', () => {
    const result = validateValue('150', { type: 'number', max: 100 });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Must be at most 100');
  });

  it('returns error for invalid number format', () => {
    const result = validateValue('not-a-number', { type: 'number' });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Must be a valid number');
  });

  it('validates number within range', () => {
    const result = validateValue('50', { type: 'number', min: 0, max: 100 });
    expect(result.isValid).toBe(true);
  });
});

describe('useSanitizedForm', () => {
  const defaultOptions = {
    initialValues: { name: '', email: '', phone: '' },
    fieldConfigs: {
      name: { type: 'text' as const, required: true, maxLength: 50 },
      email: { type: 'email' as const, required: true },
      phone: { type: 'phone' as const },
    },
  };

  it('initializes with provided values', () => {
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    expect(result.current.values).toEqual({ name: '', email: '', phone: '' });
    expect(result.current.isValid).toBe(true); // No errors until touched
    expect(result.current.isDirty).toBe(false);
  });

  it('sanitizes text input on change', () => {
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: '  <script>John</script>  ', type: 'text' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.values.name).toBe('scriptJohn/script');
    expect(result.current.isDirty).toBe(true);
  });

  it('sanitizes email input on change', () => {
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    act(() => {
      result.current.handleChange({
        target: { name: 'email', value: '  USER@EXAMPLE.COM  ', type: 'text' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.values.email).toBe('user@example.com');
  });

  it('sanitizes phone input on change', () => {
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    act(() => {
      result.current.handleChange({
        target: { name: 'phone', value: '+1-555-CALL-NOW', type: 'text' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.values.phone).toBe('+1-555--');
  });

  it('validates on change when enabled', () => {
    const { result } = renderHook(() =>
      useSanitizedForm({
        ...defaultOptions,
        validateOnChange: true,
      })
    );

    act(() => {
      result.current.setFieldValue('name', '');
    });

    expect(result.current.errors.name).toBe('This field is required');
  });

  it('does not validate on change when disabled', () => {
    const { result } = renderHook(() =>
      useSanitizedForm({
        ...defaultOptions,
        validateOnChange: false,
      })
    );

    act(() => {
      result.current.setFieldValue('name', '');
    });

    expect(result.current.errors.name).toBeUndefined();
  });

  it('validates on blur when enabled', () => {
    const { result } = renderHook(() =>
      useSanitizedForm({
        ...defaultOptions,
        validateOnChange: false,
        validateOnBlur: true,
      })
    );

    act(() => {
      result.current.handleBlur({
        target: { name: 'name' },
      } as React.FocusEvent<HTMLInputElement>);
    });

    expect(result.current.errors.name).toBe('This field is required');
    expect(result.current.touchedFields.has('name')).toBe(true);
  });

  it('enforces maxLength constraint', () => {
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'a'.repeat(100), type: 'text' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.values.name.length).toBe(50);
  });

  it('validateAll validates all fields and returns result', () => {
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateAll();
    });

    expect(isValid!).toBe(false);
    expect(result.current.errors.name).toBe('This field is required');
    expect(result.current.errors.email).toBe('This field is required');
  });

  it('handleSubmit prevents submission when invalid', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    await act(async () => {
      await result.current.handleSubmit(onSubmit)();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.touchedFields.size).toBe(3); // All fields marked as touched
  });

  it('handleSubmit calls onSubmit when valid', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    act(() => {
      result.current.setFieldValue('name', 'John Doe');
      result.current.setFieldValue('email', 'john@example.com');
    });

    await act(async () => {
      await result.current.handleSubmit(onSubmit)();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '',
    });
  });

  it('reset restores initial values and clears state', () => {
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    act(() => {
      result.current.setFieldValue('name', 'John');
      result.current.setFieldValue('email', 'invalid');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual({ name: '', email: '', phone: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.touchedFields.size).toBe(0);
    expect(result.current.isDirty).toBe(false);
  });

  it('setMultipleValues sanitizes all values', () => {
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    act(() => {
      result.current.setMultipleValues({
        name: '  <b>John</b>  ',
        email: '  TEST@EXAMPLE.COM  ',
      });
    });

    expect(result.current.values.name).toBe('bJohn/b');
    expect(result.current.values.email).toBe('test@example.com');
  });

  it('getFieldError only returns error if field is touched', () => {
    const { result } = renderHook(() =>
      useSanitizedForm({
        ...defaultOptions,
        validateOnChange: false,
      })
    );

    // Set empty value (should fail required validation when validated)
    act(() => {
      result.current.setFieldValue('name', '');
      result.current.validateAll();
    });

    // Error exists but field not touched, so getFieldError returns undefined
    expect(result.current.errors.name).toBe('This field is required');
    expect(result.current.getFieldError('name')).toBeUndefined();

    // Touch the field
    act(() => {
      result.current.handleBlur({
        target: { name: 'name' },
      } as React.FocusEvent<HTMLInputElement>);
    });

    // Now getFieldError should return the error
    expect(result.current.getFieldError('name')).toBe('This field is required');
  });

  it('handles checkbox input type', () => {
    const { result } = renderHook(() =>
      useSanitizedForm({
        initialValues: { subscribe: false },
        fieldConfigs: {},
      })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'subscribe', type: 'checkbox', checked: true },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.values.subscribe).toBe(true);
  });

  it('handles number input type', () => {
    const { result } = renderHook(() =>
      useSanitizedForm({
        initialValues: { amount: 0 },
        fieldConfigs: {
          amount: { type: 'number', min: 0, max: 1000 },
        },
      })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'amount', value: '123.45', type: 'number' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.values.amount).toBe(123.45);
  });

  it('getSanitizedValues returns sanitized copy of all values', () => {
    const { result } = renderHook(() => useSanitizedForm(defaultOptions));

    act(() => {
      result.current.setFieldValue('name', 'John');
      result.current.setFieldValue('email', 'JOHN@EXAMPLE.COM');
    });

    const sanitized = result.current.getSanitizedValues();
    expect(sanitized.email).toBe('john@example.com');
  });
});

describe('useSanitizedInput', () => {
  it('initializes with empty string by default', () => {
    const { result } = renderHook(() => useSanitizedInput());

    expect(result.current[0]).toBe('');
    expect(result.current[2]).toBeUndefined();
  });

  it('initializes with provided value', () => {
    const { result } = renderHook(() => useSanitizedInput('initial'));

    expect(result.current[0]).toBe('initial');
  });

  it('sanitizes value on set', () => {
    const { result } = renderHook(() =>
      useSanitizedInput('', { type: 'email' })
    );

    act(() => {
      result.current[1]('USER@EXAMPLE.COM');
    });

    expect(result.current[0]).toBe('user@example.com');
  });

  it('validates on set', () => {
    const { result } = renderHook(() =>
      useSanitizedInput('', { type: 'text', required: true })
    );

    act(() => {
      result.current[1]('');
    });

    expect(result.current[2]).toBe('This field is required');
  });

  it('clears error when valid', () => {
    const { result } = renderHook(() =>
      useSanitizedInput('', { type: 'text', required: true })
    );

    act(() => {
      result.current[1]('');
    });

    expect(result.current[2]).toBe('This field is required');

    act(() => {
      result.current[1]('valid value');
    });

    expect(result.current[2]).toBeUndefined();
  });
});

describe('XSS Prevention', () => {
  it('removes angle brackets from text fields', () => {
    const { result } = renderHook(() =>
      useSanitizedForm({
        initialValues: { comment: '' },
        fieldConfigs: { comment: { type: 'text' } },
      })
    );

    // Text sanitization removes angle brackets < and >
    // For comprehensive XSS protection, use 'html' type with DOMPurify
    const xssPayloads = [
      { input: '<script>alert("xss")</script>', shouldNotContain: '<' },
      { input: '<img src=x onerror=alert(1)>', shouldNotContain: '<' },
      { input: '<svg onload=alert(1)>', shouldNotContain: '<' },
    ];

    xssPayloads.forEach(({ input, shouldNotContain }) => {
      act(() => {
        result.current.setFieldValue('comment', input);
      });

      expect(result.current.values.comment).not.toContain(shouldNotContain);
    });
  });

  it('prevents script injection in HTML fields', () => {
    const { result } = renderHook(() =>
      useSanitizedForm({
        initialValues: { richText: '' },
        fieldConfigs: { richText: { type: 'html' } },
      })
    );

    act(() => {
      result.current.setFieldValue(
        'richText',
        '<p>Hello</p><script>evil()</script><b>World</b>'
      );
    });

    expect(result.current.values.richText).not.toContain('<script>');
    expect(result.current.values.richText).toContain('Hello');
    expect(result.current.values.richText).toContain('World');
  });
});

describe('SQL Injection Prevention', () => {
  it('removes SQL special characters in search fields', () => {
    const { result } = renderHook(() =>
      useSanitizedForm({
        initialValues: { search: '' },
        fieldConfigs: { search: { type: 'search' } },
      })
    );

    act(() => {
      result.current.setFieldValue('search', "'; DROP TABLE users; --");
    });

    expect(result.current.values.search).not.toContain("'");
    expect(result.current.values.search).not.toContain(';');
  });
});
