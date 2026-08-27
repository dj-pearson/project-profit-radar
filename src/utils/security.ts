import DOMPurify from 'dompurify';

// Input validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
};

export const validateCompanyName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

export const validateProjectName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

export const validateBudget = (budget: string): boolean => {
  const budgetNum = parseFloat(budget);
  return !isNaN(budgetNum) && budgetNum >= 0 && budgetNum <= 10000000;
};

// Sanitization utilities
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: [], // SECURITY: Removed 'class' to prevent CSS-based attacks
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  });
};

// CSRF token utilities
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const setCSRFToken = (token: string): void => {
  sessionStorage.setItem('csrf_token', token);
};

export const getCSRFToken = (): string | null => {
  return sessionStorage.getItem('csrf_token');
};

export const validateCSRFToken = (token: string): boolean => {
  const storedToken = getCSRFToken();
  return storedToken === token && token.length === 64;
};

// addSecurityHeaders() was removed here (US-301).
//
// It injected a SECOND Content-Security-Policy as a meta tag. CSP policies
// combine restrictively: where two are present a resource must satisfy BOTH.
// Its production script-src was "'self' https://api.ipify.org
// https://*.posthog.com" - no Stripe, no Google Tag Manager, no Sentry, no
// Google or Apple sign-in, and none of the inline-script hashes carried in
// public/_headers. Adding this to a layout because it sounds like a good idea
// would have broken checkout, analytics, SSO and the Trusted Types bootstrap
// on the next deploy. It never ran: its only caller was
// src/hooks/useSecurityEnhancement.ts, which was mounted nowhere and is also
// deleted.
//
// The real CSP is the HTTP header in public/_headers, which is strictly more
// trustworthy than a meta tag and is already guarded by
// scripts/check-csp-hashes.mjs. That guard now also fails if a second CSP
// definition reappears anywhere under src/.

export const checkRateLimit = (key: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now - record.lastReset > windowMs) {
    rateLimitStore.set(key, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
};

// File upload validation with magic number verification
export const validateFileUpload = async (file: File): Promise<{ isValid: boolean; errors: string[] }> => {
  const errors: string[] = [];
  const maxSizeInMB = 10;

  // Magic numbers (file signatures) for content validation
  const magicNumbers: { [key: string]: number[] } = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
    'application/zip': [0x50, 0x4B, 0x03, 0x04], // Also used by .docx, .xlsx
  };

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  // Size check
  if (file.size > maxSizeInMB * 1024 * 1024) {
    errors.push(`File size must be less than ${maxSizeInMB}MB`);
  }

  // MIME type check
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed');
  }

  // Filename validation - prevent malicious characters
  // A control character in a filename is precisely what this rejects, so the
  // rule is warning about the thing the check exists for.
  // eslint-disable-next-line no-control-regex
  if (/[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
    errors.push('Filename contains invalid characters');
  }

  // SECURITY: Magic number validation to prevent disguised malicious files
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Map Office Open XML formats to zip signature
    let mimeTypeToCheck = file.type;
    if (file.type.includes('officedocument')) {
      mimeTypeToCheck = 'application/zip';
    }

    const expectedMagicNumbers = magicNumbers[mimeTypeToCheck];
    if (expectedMagicNumbers) {
      const matches = expectedMagicNumbers.every((byte, index) => bytes[index] === byte);
      if (!matches) {
        errors.push('File content does not match declared type. Possible file type mismatch or corruption.');
      }
    }
    // Text files and some types don't have magic numbers, so we skip validation
  } catch (error) {
    errors.push('Failed to validate file content');
    console.error('File content validation error:', error);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Synchronous version for backward compatibility (without magic number check)
export const validateFileUploadSync = (file: File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const maxSizeInMB = 10;
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (file.size > maxSizeInMB * 1024 * 1024) {
    errors.push(`File size must be less than ${maxSizeInMB}MB`);
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed');
  }

  // A control character in a filename is precisely what this rejects, so the
  // rule is warning about the thing the check exists for.
  // eslint-disable-next-line no-control-regex
  if (/[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
    errors.push('Filename contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Log CSP violations
export const logCSPViolation = async (violation: any): Promise<void> => {
  try {
    await fetch('/api/csp-violation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_uri: violation['document-uri'],
        blocked_uri: violation['blocked-uri'],
        violated_directive: violation['violated-directive'],
        original_policy: violation['original-policy'],
        user_agent: navigator.userAgent,
        source_file: violation['source-file'],
        line_number: violation['line-number'],
        column_number: violation['column-number']
      })
    });
  } catch (error) {
    console.error('Failed to log CSP violation:', error);
  }
};