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
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
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
    ALLOWED_ATTR: ['class']
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

// Security headers utilities
export const addSecurityHeaders = (): void => {
  // Set CSP via meta tag (since we can't set HTTP headers in frontend)
  const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!existingCSP) {
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.ipify.org;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https: blob:;
      connect-src 'self' https://api.ipify.org https://*.supabase.co;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
      upgrade-insecure-requests;
    `.replace(/\s+/g, ' ').trim();
    document.head.appendChild(cspMeta);
  }

  // Add other security headers via meta tags where possible
  const securityMetas = [
    { name: 'referrer', content: 'strict-origin-when-cross-origin' },
    { httpEquiv: 'X-Content-Type-Options', content: 'nosniff' },
    { httpEquiv: 'X-Frame-Options', content: 'DENY' },
    { httpEquiv: 'X-XSS-Protection', content: '1; mode=block' }
  ];

  securityMetas.forEach(meta => {
    const existing = document.querySelector(`meta[${meta.httpEquiv ? 'http-equiv' : 'name'}="${meta.httpEquiv || meta.name}"]`);
    if (!existing) {
      const metaElement = document.createElement('meta');
      if (meta.httpEquiv) {
        metaElement.httpEquiv = meta.httpEquiv;
      } else {
        metaElement.name = meta.name;
      }
      metaElement.content = meta.content;
      document.head.appendChild(metaElement);
    }
  });
};

// Rate limiting utilities (client-side basic implementation)
interface RateLimitRecord {
  count: number;
  lastReset: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

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

// File upload validation
export const validateFileUpload = (file: File): { isValid: boolean; errors: string[] } => {
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

  // Check for potentially malicious filenames
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