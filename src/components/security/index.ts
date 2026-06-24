/**
 * Security Components Export
 *
 * Defense-in-Depth Security Components:
 * - SecureRoute: Full route protection with all security layers
 * - SecurePermission: Single permission check wrapper
 * - SecurePermissions: Multiple permissions check wrapper
 * - SecureOwnership: Resource ownership check wrapper
 * - SecureElement: Conditional UI rendering
 * - SecureAction: Action/button security wrapper
 */

export {
  SecureRoute,
  SecurePermission,
  SecurePermissions,
  SecureOwnership,
  SecureElement,
  SecureAction,
} from './SecureRoute';

export type { default as SecureRouteDefault } from './SecureRoute';
