/**
 * Security Library Export
 *
 * Defense-in-Depth Security Architecture:
 *
 * Layer 1: Authentication (WHO are you?)
 *   - Session validation via AuthContext
 *   - Login protection (brute force prevention)
 *
 * Layer 2: Authorization (WHAT can you do?)
 *   - Permission checks via securityService
 *   - Role-based access control
 *
 * Layer 3: Resource Ownership (IS this yours?)
 *   - Tenant isolation (company_id filtering)
 *   - Owner/team checks
 *
 * Layer 4: Database RLS (FINAL enforcement)
 *   - PostgreSQL Row-Level Security policies
 */

// Types
export * from './types';

// Edge Function Security Headers Types (US-006)
export type { SecurityHeaders, SecurityHeaderName } from './edgeFunctionHeaders';

// Security Service (Layer 2 & 3)
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  checkRoleLevel,
  checkAllowedRoles,
  checkResourceOwnership,
  checkCompanyAccess,
  performSecurityCheck,
  logSecurityEvent,
  getUserPermissions,
  getRoleLevel,
  permissionMatchesScope,
} from './securityService';

// Input Sanitization
export {
  sanitizeHtml,
  stripHtml,
  encodeUrl,
  encodeWhatsAppUrl,
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  maskSensitiveData,
  sanitizeSqlInput,
} from './sanitize';

// Login Protection (Layer 1)
export {
  checkLoginAttempt,
  recordFailedLogin,
  clearFailedAttempts,
  getLockoutMessage,
} from './loginProtection';

// CSRF Protection (US-003)
export {
  generateCsrfToken,
  validateCsrfToken,
  getCsrfToken,
  storeCsrfToken,
} from './csrfProtection';

// CSRF React Components & Hooks (US-003)
export {
  useCsrfToken,
  CsrfTokenField,
} from './csrfProtection.tsx';

// Client-Side Rate Limiting (US-004)
export {
  RateLimiter,
  createEndpointLimiter,
  DEFAULT_RATE_LIMITS,
} from './rateLimiter';
export type { RateLimitResult, RateLimiterConfig } from './rateLimiter';

// Trusted Types (DOM XSS Prevention — US-008)
export {
  initTrustedTypes,
  createSafeHtml,
  createSafeScriptUrl,
  isTrustedTypesSupported,
  ALLOWED_SCRIPT_ORIGINS,
} from './trustedTypes';

// Subresource Integrity (US-009)
export {
  computeSriHash,
  verifySriHash,
  loadScriptWithSri,
  loadStylesheetWithSri,
} from './sriVerification';
export type { LoadScriptWithSriOptions } from './sriVerification';

// API Request Signing (US-007)
export {
  signRequest,
  verifySignature,
  addTimestamp,
  isRequestFresh,
  deriveSigningKey,
  buildCanonicalRequest,
  constantTimeEqual,
  REQUEST_SIGNING_CONFIG,
} from './requestSigning';

// Vulnerability Manifest (US-014)
export {
  KNOWN_VULNERABILITIES,
  type KnownVulnerability,
  type VulnerabilitySeverity,
} from './vulnerabilityManifest';

// SSRF Prevention (US-001)
export {
  validateUrl,
  sanitizeUrl,
  isPrivateIp,
  ALLOWED_EXTERNAL_DOMAINS,
} from './ssrfPrevention';
export type {
  UrlValidationOptions,
  UrlValidationResult,
} from './ssrfPrevention';

// URL Validation for Open Redirect Prevention
export {
  validateRedirectUrl,
  isTrustedDomain,
  TRUSTED_REDIRECT_DOMAINS,
} from './urlValidation';
export type { RedirectValidationResult } from './urlValidation';

// File Upload Validation
export {
  validateFileUpload,
  generateSecureFilename,
  sanitizeFilename,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZES,
  ALLOWED_EXTENSIONS,
} from './fileUploadValidation';
export type {
  FileValidationResult,
  FileValidationOptions,
} from './fileUploadValidation';

// Error Information Leakage Prevention (US-005)
export {
  sanitizeError,
  sanitizeErrorMessage,
  classifyError,
  containsSensitiveContent,
  SENSITIVE_PATTERNS,
  SafeErrorBoundary,
} from './errorSanitizer';
export type {
  SafeErrorCategory,
  SanitizedError,
} from './errorSanitizer';
