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
