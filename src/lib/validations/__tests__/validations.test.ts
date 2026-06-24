import { describe, it, expect } from 'vitest';
import {
  // Common schemas
  uuidSchema,
  dateSchema,
  datetimeSchema,
  urlSchema,
  phoneSchema,
  emailSchema,
  currencySchema,
  percentageSchema,
  coordinateSchema,
  sanitizeHtml,
  sanitizedStringSchema,
  // Project schemas
  projectSchema,
  projectUpdateSchema,
  // Expense schemas
  expenseSchema,
  expenseApprovalSchema,
  // User schemas
  profileUpdateSchema,
  passwordChangeSchema,
  emailUpdateSchema,
  // Time tracking schemas
  timeEntrySchema,
  quickTimeEntrySchema,
} from '../index';

describe('Common Validation Schemas', () => {
  describe('uuidSchema', () => {
    it('accepts valid UUIDs', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(uuidSchema.safeParse(validUuid).success).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid ID format');
      }
    });

    it('rejects empty strings', () => {
      expect(uuidSchema.safeParse('').success).toBe(false);
    });
  });

  describe('dateSchema', () => {
    it('accepts valid YYYY-MM-DD dates', () => {
      expect(dateSchema.safeParse('2024-01-15').success).toBe(true);
      expect(dateSchema.safeParse('2023-12-31').success).toBe(true);
    });

    it('rejects invalid date formats', () => {
      expect(dateSchema.safeParse('01-15-2024').success).toBe(false);
      expect(dateSchema.safeParse('2024/01/15').success).toBe(false);
      expect(dateSchema.safeParse('Jan 15, 2024').success).toBe(false);
    });
  });

  describe('datetimeSchema', () => {
    it('accepts valid ISO datetime strings', () => {
      expect(datetimeSchema.safeParse('2024-01-15T10:30:00Z').success).toBe(true);
      expect(datetimeSchema.safeParse('2024-01-15T10:30:00.000Z').success).toBe(true);
    });

    it('rejects invalid datetime formats', () => {
      expect(datetimeSchema.safeParse('2024-01-15').success).toBe(false);
      expect(datetimeSchema.safeParse('10:30:00').success).toBe(false);
    });
  });

  describe('urlSchema', () => {
    it('accepts valid URLs', () => {
      expect(urlSchema.safeParse('https://example.com').success).toBe(true);
      expect(urlSchema.safeParse('https://example.com/path/to/resource').success).toBe(true);
      expect(urlSchema.safeParse('http://localhost:3000').success).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(urlSchema.safeParse('not-a-url').success).toBe(false);
      expect(urlSchema.safeParse('example.com').success).toBe(false);
    });

    it('rejects URLs exceeding max length', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2050);
      const result = urlSchema.safeParse(longUrl);
      expect(result.success).toBe(false);
    });
  });

  describe('phoneSchema', () => {
    it('accepts valid phone numbers', () => {
      expect(phoneSchema.safeParse('1234567890').success).toBe(true);
      expect(phoneSchema.safeParse('(555) 123-4567').success).toBe(true);
      expect(phoneSchema.safeParse('+1 555-123-4567').success).toBe(true);
    });

    it('rejects phone numbers with letters', () => {
      expect(phoneSchema.safeParse('555-CALL-NOW').success).toBe(false);
    });

    it('rejects too short phone numbers', () => {
      expect(phoneSchema.safeParse('123').success).toBe(false);
    });

    it('rejects too long phone numbers', () => {
      expect(phoneSchema.safeParse('12345678901234567890123').success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('accepts valid emails', () => {
      expect(emailSchema.safeParse('user@example.com').success).toBe(true);
      expect(emailSchema.safeParse('user.name+tag@example.co.uk').success).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(emailSchema.safeParse('not-an-email').success).toBe(false);
      expect(emailSchema.safeParse('@example.com').success).toBe(false);
      expect(emailSchema.safeParse('user@').success).toBe(false);
    });

    it('transforms email to lowercase and trims when valid', () => {
      // Note: Zod validates before transforming, so spaces in email cause validation failure
      const result = emailSchema.safeParse('USER@EXAMPLE.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('user@example.com');
      }
    });

    it('rejects email with leading/trailing spaces', () => {
      // Emails with spaces are invalid per RFC
      const result = emailSchema.safeParse('  user@example.com  ');
      expect(result.success).toBe(false);
    });
  });

  describe('currencySchema', () => {
    it('accepts valid currency amounts', () => {
      expect(currencySchema.safeParse(100).success).toBe(true);
      expect(currencySchema.safeParse(99.99).success).toBe(true);
      expect(currencySchema.safeParse(1000000).success).toBe(true);
    });

    it('rejects negative amounts', () => {
      const result = currencySchema.safeParse(-50);
      expect(result.success).toBe(false);
    });

    it('rejects zero', () => {
      expect(currencySchema.safeParse(0).success).toBe(false);
    });

    it('rejects amounts with more than 2 decimal places', () => {
      const result = currencySchema.safeParse(99.999);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Amount must have at most 2 decimal places');
      }
    });

    it('rejects amounts exceeding max value', () => {
      expect(currencySchema.safeParse(9999999999.99).success).toBe(false);
    });
  });

  describe('percentageSchema', () => {
    it('accepts valid percentages', () => {
      expect(percentageSchema.safeParse(0).success).toBe(true);
      expect(percentageSchema.safeParse(50).success).toBe(true);
      expect(percentageSchema.safeParse(100).success).toBe(true);
    });

    it('rejects negative percentages', () => {
      expect(percentageSchema.safeParse(-10).success).toBe(false);
    });

    it('rejects percentages over 100', () => {
      expect(percentageSchema.safeParse(150).success).toBe(false);
    });
  });

  describe('coordinateSchema', () => {
    it('accepts valid coordinates', () => {
      const result = coordinateSchema.safeParse({ latitude: 40.7128, longitude: -74.0060 });
      expect(result.success).toBe(true);
    });

    it('rejects invalid latitude', () => {
      expect(coordinateSchema.safeParse({ latitude: 91, longitude: 0 }).success).toBe(false);
      expect(coordinateSchema.safeParse({ latitude: -91, longitude: 0 }).success).toBe(false);
    });

    it('rejects invalid longitude', () => {
      expect(coordinateSchema.safeParse({ latitude: 0, longitude: 181 }).success).toBe(false);
      expect(coordinateSchema.safeParse({ latitude: 0, longitude: -181 }).success).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('removes HTML tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('removes angle brackets and content between them', () => {
      // The sanitizer treats < ... > as HTML tags and removes the entire match
      expect(sanitizeHtml('1 < 2 > 0')).toBe('1  0');
      // Lone angle brackets are also removed
      expect(sanitizeHtml('x < y')).toBe('x  y');
      expect(sanitizeHtml('x > y')).toBe('x  y');
    });

    it('trims whitespace', () => {
      expect(sanitizeHtml('  hello  ')).toBe('hello');
    });

    it('handles empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });

  describe('sanitizedStringSchema', () => {
    it('sanitizes and validates strings', () => {
      const schema = sanitizedStringSchema(100);
      const result = schema.safeParse('<b>Hello</b> World');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('Hello World');
      }
    });

    it('rejects strings exceeding max length', () => {
      const schema = sanitizedStringSchema(10);
      expect(schema.safeParse('a'.repeat(20)).success).toBe(false);
    });
  });
});

describe('Project Validation Schemas', () => {
  const validProject = {
    name: 'Test Project',
    client_name: 'Test Client',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
  };

  describe('projectSchema', () => {
    it('accepts valid project data', () => {
      const result = projectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('requires project name', () => {
      const invalid = { ...validProject, name: '' };
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires client name', () => {
      const invalid = { ...validProject, client_name: '' };
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates end date is after start date', () => {
      const invalid = { ...validProject, start_date: '2024-12-31', end_date: '2024-01-01' };
      const result = projectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('End date must be on or after start date');
      }
    });

    it('accepts optional fields', () => {
      const withOptionals = {
        ...validProject,
        description: 'A test project',
        budget: 50000,
        status: 'active' as const,
        priority: 'high' as const,
      };
      expect(projectSchema.safeParse(withOptionals).success).toBe(true);
    });

    it('validates budget is positive', () => {
      const invalid = { ...validProject, budget: -1000 };
      expect(projectSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates status enum', () => {
      const invalid = { ...validProject, status: 'invalid_status' };
      expect(projectSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates priority enum', () => {
      const invalid = { ...validProject, priority: 'super_urgent' };
      expect(projectSchema.safeParse(invalid).success).toBe(false);
    });

    it('accepts empty string for optional client_email', () => {
      const withEmptyEmail = { ...validProject, client_email: '' };
      expect(projectSchema.safeParse(withEmptyEmail).success).toBe(true);
    });

    it('validates client_email format when provided', () => {
      const withInvalidEmail = { ...validProject, client_email: 'not-an-email' };
      expect(projectSchema.safeParse(withInvalidEmail).success).toBe(false);
    });
  });

  describe('projectUpdateSchema', () => {
    it('requires project ID', () => {
      const update = { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Updated Name' };
      expect(projectUpdateSchema.safeParse(update).success).toBe(true);
    });

    it('validates UUID format for ID', () => {
      const update = { id: 'invalid-id', name: 'Updated Name' };
      expect(projectUpdateSchema.safeParse(update).success).toBe(false);
    });

    it('allows partial updates', () => {
      const update = { id: '123e4567-e89b-12d3-a456-426614174000', budget: 75000 };
      expect(projectUpdateSchema.safeParse(update).success).toBe(true);
    });
  });
});

describe('Expense Validation Schemas', () => {
  const validExpense = {
    vendor_name: 'Home Depot',
    amount: 500.00,
    expense_date: '2024-01-15',
    payment_method: 'Credit Card' as const,
  };

  describe('expenseSchema', () => {
    it('accepts valid expense data', () => {
      expect(expenseSchema.safeParse(validExpense).success).toBe(true);
    });

    it('requires vendor name', () => {
      const invalid = { ...validExpense, vendor_name: '' };
      expect(expenseSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates amount is positive', () => {
      const invalid = { ...validExpense, amount: 0 };
      expect(expenseSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates amount maximum', () => {
      const invalid = { ...validExpense, amount: 2000000 };
      expect(expenseSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates payment method enum', () => {
      const invalid = { ...validExpense, payment_method: 'Bitcoin' };
      expect(expenseSchema.safeParse(invalid).success).toBe(false);
    });

    it('accepts all valid payment methods', () => {
      const methods = ['Cash', 'Check', 'Credit Card', 'Debit Card', 'Wire Transfer', 'ACH', 'Company Account'];
      methods.forEach(method => {
        const expense = { ...validExpense, payment_method: method };
        expect(expenseSchema.safeParse(expense).success).toBe(true);
      });
    });

    it('validates date format', () => {
      const invalid = { ...validExpense, expense_date: '01-15-2024' };
      expect(expenseSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates receipt URL format', () => {
      const withInvalidUrl = { ...validExpense, receipt_url: 'not-a-url' };
      expect(expenseSchema.safeParse(withInvalidUrl).success).toBe(false);
    });

    it('accepts empty string for optional receipt URL', () => {
      const withEmptyUrl = { ...validExpense, receipt_url: '' };
      expect(expenseSchema.safeParse(withEmptyUrl).success).toBe(true);
    });

    it('validates tax amount is non-negative', () => {
      const invalid = { ...validExpense, tax_amount: -10 };
      expect(expenseSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('expenseApprovalSchema', () => {
    it('accepts valid approval', () => {
      const approval = {
        expense_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'approved' as const,
      };
      expect(expenseApprovalSchema.safeParse(approval).success).toBe(true);
    });

    it('validates expense ID format', () => {
      const invalid = { expense_id: 'invalid-id', status: 'approved' };
      expect(expenseApprovalSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates status enum', () => {
      const invalid = {
        expense_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending',
      };
      expect(expenseApprovalSchema.safeParse(invalid).success).toBe(false);
    });

    it('accepts approval notes', () => {
      const approval = {
        expense_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'rejected' as const,
        approval_notes: 'Missing receipt',
      };
      expect(expenseApprovalSchema.safeParse(approval).success).toBe(true);
    });
  });
});

describe('User Validation Schemas', () => {
  describe('profileUpdateSchema', () => {
    it('accepts valid profile update', () => {
      const update = {
        full_name: 'John Doe',
        phone: '555-123-4567',
        job_title: 'Project Manager',
      };
      expect(profileUpdateSchema.safeParse(update).success).toBe(true);
    });

    it('validates full_name minimum length', () => {
      const invalid = { full_name: 'J' };
      expect(profileUpdateSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates phone format', () => {
      const invalid = { phone: 'call-me-maybe' };
      expect(profileUpdateSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates hourly_rate range', () => {
      expect(profileUpdateSchema.safeParse({ hourly_rate: -10 }).success).toBe(false);
      expect(profileUpdateSchema.safeParse({ hourly_rate: 1500 }).success).toBe(false);
      expect(profileUpdateSchema.safeParse({ hourly_rate: 75 }).success).toBe(true);
    });

    it('validates avatar URL format', () => {
      expect(profileUpdateSchema.safeParse({ avatar_url: 'not-a-url' }).success).toBe(false);
      expect(profileUpdateSchema.safeParse({ avatar_url: 'https://example.com/avatar.jpg' }).success).toBe(true);
    });

    it('accepts empty string for optional phone', () => {
      expect(profileUpdateSchema.safeParse({ phone: '' }).success).toBe(true);
    });
  });

  describe('passwordChangeSchema', () => {
    it('accepts valid password change', () => {
      const change = {
        current_password: 'oldPassword123',
        new_password: 'NewPassword1!',
        confirm_password: 'NewPassword1!',
      };
      expect(passwordChangeSchema.safeParse(change).success).toBe(true);
    });

    it('requires minimum 8 characters', () => {
      const invalid = {
        current_password: 'old',
        new_password: 'New1!',
        confirm_password: 'New1!',
      };
      expect(passwordChangeSchema.safeParse(invalid).success).toBe(false);
    });

    it('requires uppercase letter', () => {
      const invalid = {
        current_password: 'oldpassword',
        new_password: 'newpassword1!',
        confirm_password: 'newpassword1!',
      };
      expect(passwordChangeSchema.safeParse(invalid).success).toBe(false);
    });

    it('requires lowercase letter', () => {
      const invalid = {
        current_password: 'oldpassword',
        new_password: 'NEWPASSWORD1!',
        confirm_password: 'NEWPASSWORD1!',
      };
      expect(passwordChangeSchema.safeParse(invalid).success).toBe(false);
    });

    it('requires number', () => {
      const invalid = {
        current_password: 'oldpassword',
        new_password: 'NewPassword!',
        confirm_password: 'NewPassword!',
      };
      expect(passwordChangeSchema.safeParse(invalid).success).toBe(false);
    });

    it('requires special character', () => {
      const invalid = {
        current_password: 'oldpassword',
        new_password: 'NewPassword1',
        confirm_password: 'NewPassword1',
      };
      expect(passwordChangeSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates passwords match', () => {
      const invalid = {
        current_password: 'oldpassword',
        new_password: 'NewPassword1!',
        confirm_password: 'DifferentPassword1!',
      };
      const result = passwordChangeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Passwords do not match');
      }
    });

    it('validates max password length (bcrypt limit)', () => {
      const invalid = {
        current_password: 'oldpassword',
        new_password: 'A1!' + 'a'.repeat(75),
        confirm_password: 'A1!' + 'a'.repeat(75),
      };
      expect(passwordChangeSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('emailUpdateSchema', () => {
    it('accepts valid email update', () => {
      const result = emailUpdateSchema.safeParse({ email: 'new@example.com' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(emailUpdateSchema.safeParse({ email: 'invalid' }).success).toBe(false);
    });

    it('transforms to lowercase', () => {
      const result = emailUpdateSchema.safeParse({ email: 'USER@EXAMPLE.COM' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });
  });
});

describe('Time Tracking Validation Schemas', () => {
  const validTimeEntry = {
    project_id: '123e4567-e89b-12d3-a456-426614174000',
    task_description: 'Foundation work',
    start_time: '2024-01-15T08:00:00Z',
  };

  describe('timeEntrySchema', () => {
    it('accepts valid time entry', () => {
      expect(timeEntrySchema.safeParse(validTimeEntry).success).toBe(true);
    });

    it('requires project ID', () => {
      const invalid = { ...validTimeEntry, project_id: '' };
      expect(timeEntrySchema.safeParse(invalid).success).toBe(false);
    });

    it('validates project ID format', () => {
      const invalid = { ...validTimeEntry, project_id: 'invalid-id' };
      expect(timeEntrySchema.safeParse(invalid).success).toBe(false);
    });

    it('requires task description', () => {
      const invalid = { ...validTimeEntry, task_description: '' };
      expect(timeEntrySchema.safeParse(invalid).success).toBe(false);
    });

    it('validates end time is after start time', () => {
      const invalid = {
        ...validTimeEntry,
        end_time: '2024-01-15T07:00:00Z', // Before start time
      };
      const result = timeEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('End time must be after start time');
      }
    });

    it('accepts valid end time after start time', () => {
      const valid = {
        ...validTimeEntry,
        end_time: '2024-01-15T17:00:00Z',
      };
      expect(timeEntrySchema.safeParse(valid).success).toBe(true);
    });

    it('validates break duration range', () => {
      expect(timeEntrySchema.safeParse({ ...validTimeEntry, break_duration: -10 }).success).toBe(false);
      expect(timeEntrySchema.safeParse({ ...validTimeEntry, break_duration: 500 }).success).toBe(false);
      expect(timeEntrySchema.safeParse({ ...validTimeEntry, break_duration: 60 }).success).toBe(true);
    });

    it('validates location coordinates', () => {
      const withLocation = {
        ...validTimeEntry,
        location_latitude: 40.7128,
        location_longitude: -74.0060,
        location_accuracy: 10,
      };
      expect(timeEntrySchema.safeParse(withLocation).success).toBe(true);
    });

    it('validates latitude range', () => {
      expect(timeEntrySchema.safeParse({ ...validTimeEntry, location_latitude: 91 }).success).toBe(false);
      expect(timeEntrySchema.safeParse({ ...validTimeEntry, location_latitude: -91 }).success).toBe(false);
    });

    it('validates longitude range', () => {
      expect(timeEntrySchema.safeParse({ ...validTimeEntry, location_longitude: 181 }).success).toBe(false);
      expect(timeEntrySchema.safeParse({ ...validTimeEntry, location_longitude: -181 }).success).toBe(false);
    });
  });

  describe('quickTimeEntrySchema', () => {
    const validQuickEntry = {
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2024-01-15',
      hours: 8,
      task_description: 'General construction work',
    };

    it('accepts valid quick time entry', () => {
      expect(quickTimeEntrySchema.safeParse(validQuickEntry).success).toBe(true);
    });

    it('validates minimum hours (15 minutes)', () => {
      const invalid = { ...validQuickEntry, hours: 0.1 };
      expect(quickTimeEntrySchema.safeParse(invalid).success).toBe(false);
    });

    it('validates maximum hours', () => {
      const invalid = { ...validQuickEntry, hours: 25 };
      expect(quickTimeEntrySchema.safeParse(invalid).success).toBe(false);
    });

    it('accepts 0.25 hours (15 minutes)', () => {
      const valid = { ...validQuickEntry, hours: 0.25 };
      expect(quickTimeEntrySchema.safeParse(valid).success).toBe(true);
    });

    it('validates date format', () => {
      const invalid = { ...validQuickEntry, date: '01-15-2024' };
      expect(quickTimeEntrySchema.safeParse(invalid).success).toBe(false);
    });

    it('validates task description max length', () => {
      const invalid = { ...validQuickEntry, task_description: 'a'.repeat(501) };
      expect(quickTimeEntrySchema.safeParse(invalid).success).toBe(false);
    });
  });
});

// Security-focused tests
describe('Security Validation Tests', () => {
  describe('XSS Prevention', () => {
    it('sanitizes script tags', () => {
      const malicious = '<script>alert("xss")</script>Hello';
      expect(sanitizeHtml(malicious)).not.toContain('<script>');
      expect(sanitizeHtml(malicious)).not.toContain('</script>');
    });

    it('sanitizes event handlers', () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('onerror');
    });

    it('sanitizes nested tags', () => {
      const malicious = '<div><script>evil()</script></div>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });
  });

  describe('SQL Injection Prevention (via strict typing)', () => {
    it('UUID schema prevents SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      expect(uuidSchema.safeParse(sqlInjection).success).toBe(false);
    });

    it('email schema prevents SQL injection attempts', () => {
      const sqlInjection = "user@example.com'; DROP TABLE users; --";
      expect(emailSchema.safeParse(sqlInjection).success).toBe(false);
    });
  });

  describe('Input Length Limits', () => {
    it('project name has reasonable length limit', () => {
      const longName = 'a'.repeat(201);
      const project = {
        name: longName,
        client_name: 'Test',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };
      expect(projectSchema.safeParse(project).success).toBe(false);
    });

    it('description has reasonable length limit', () => {
      const longDescription = 'a'.repeat(2001);
      const project = {
        name: 'Test',
        description: longDescription,
        client_name: 'Test',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };
      expect(projectSchema.safeParse(project).success).toBe(false);
    });
  });

  describe('Currency Precision', () => {
    it('prevents floating point precision issues', () => {
      // 0.1 + 0.2 !== 0.3 in JavaScript
      expect(currencySchema.safeParse(0.30).success).toBe(true);
      expect(currencySchema.safeParse(0.123).success).toBe(false);
    });
  });
});
