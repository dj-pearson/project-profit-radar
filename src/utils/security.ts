/**
 * The two validators ResetPassword.tsx uses. Nothing else.
 *
 * This file used to be a parallel security module: a third sanitizeHtml
 * (regex/DOMPurify, alongside the DOMPurify one in lib/security/sanitize.ts and
 * the regex one in lib/validations), a second checkRateLimit that counted in
 * localStorage and was defeated by clearing it, a duplicate set of CSRF helpers
 * next to the real src/lib/security/csrfProtection.ts, duplicate file-upload
 * validation, an unreferenced logCSPViolation, and addSecurityHeaders(), which
 * injected a second Content-Security-Policy (US-301).
 *
 * Every one of those was unreferenced. That is the hazard, not the duplication:
 * a module whose exports read as protection gets adopted on the strength of its
 * name, and nobody audits code nobody calls. The localStorage rate limiter
 * returning true is the shape US-302 AC4 is about.
 *
 * They are deleted. Reach for src/lib/security/ - it is the one with tests.
 */
// Input validation utilities
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

// Delegates rather than reimplementing. The version this replaces was a bare
// DOMPurify call with an empty allowlist, which strips tags but does nothing
// about URL-encoded or entity-encoded payloads; lib/security's does both, plus
// a defence-in-depth pass over known-executable patterns, and it is the one
// covered by the XSS suite.
export { sanitizeInput } from '@/lib/security/sanitize';
