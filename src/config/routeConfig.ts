/**
 * Route Configuration for BuildDesk
 * Centralizes route definitions and access control
 */

export type UserRole = 'root_admin' | 'admin' | 'project_manager' | 'field_supervisor' | 'office_staff' | 'accounting' | 'client_portal';

export interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
  requiresAuth: boolean;
  description?: string;
}

/**
 * Route access control configuration
 * Each route specifies which roles can access it
 */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  // Public routes (no auth required) - handled separately
  '/': [],
  '/pricing': [],
  '/features': [],
  '/login': [],
  '/auth': [],

  // Dashboard & Core
  '/dashboard': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
  '/my-tasks': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],

  // Hub Pages
  '/projects-hub': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
  '/financial-hub': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/people-hub': ['root_admin', 'admin', 'project_manager'],
  '/operations-hub': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/admin-hub': ['root_admin', 'admin'],

  // Project Management
  '/projects': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
  '/projects/:projectId': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
  '/projects/:projectId/tasks/new': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/create-project': ['root_admin', 'admin', 'project_manager'],
  '/schedule-management': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
  '/visual-project': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],

  // Project Operations
  '/job-costing': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/daily-reports': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/rfis': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
  '/submittals': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
  '/change-orders': ['root_admin', 'admin', 'project_manager'],
  '/punch-list': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/documents': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
  '/materials': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
  '/material-tracking': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
  '/equipment': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],

  // Financial
  '/financial': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/finance-hub': ['root_admin', 'admin', 'accounting'],
  '/finance/hub': ['root_admin', 'admin', 'accounting'],
  '/finance/chart-of-accounts': ['root_admin', 'admin', 'accounting'],
  '/finance/general-ledger': ['root_admin', 'admin', 'accounting'],
  '/finance/journal-entries': ['root_admin', 'admin', 'accounting'],
  '/finance/accounts-payable': ['root_admin', 'admin', 'accounting'],
  '/finance/bill-payments': ['root_admin', 'admin', 'accounting'],
  '/finance/balance-sheet': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/finance/profit-loss': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/finance/trial-balance': ['root_admin', 'admin', 'accounting'],
  '/finance/cash-flow': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/finance/fiscal-periods': ['root_admin', 'admin', 'accounting'],
  '/estimates': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/reports': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/purchase-orders': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/vendors': ['root_admin', 'admin', 'accounting'],
  '/quickbooks-routing': ['root_admin', 'admin', 'accounting'],
  '/payment-center': ['root_admin', 'admin', 'accounting'],

  // People & Team
  '/team': ['root_admin', 'admin', 'project_manager'],
  '/crew-scheduling': ['root_admin', 'admin', 'project_manager'],
  '/time-tracking': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],

  // CRM (People Hub)
  '/crm': ['root_admin', 'admin', 'project_manager'],
  '/crm/leads': ['root_admin', 'admin', 'project_manager'],
  '/crm/contacts': ['root_admin', 'admin', 'project_manager'],
  '/crm/opportunities': ['root_admin', 'admin', 'project_manager'],
  '/crm/pipeline': ['root_admin', 'admin', 'project_manager'],
  '/crm/lead-intelligence': ['root_admin', 'admin', 'project_manager'],
  '/crm/workflows': ['root_admin', 'admin'],
  '/crm/campaigns': ['root_admin', 'admin'],
  '/crm/analytics': ['root_admin', 'admin', 'project_manager'],
  '/email-marketing': ['root_admin', 'admin'],

  // Operations
  '/safety': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/compliance-audit': ['root_admin', 'admin'],
  '/gdpr-compliance': ['root_admin', 'admin'],
  '/permit-management': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/environmental-permitting': ['root_admin', 'admin', 'project_manager'],
  '/bond-insurance': ['root_admin', 'admin', 'accounting'],
  '/warranty-management': ['root_admin', 'admin', 'project_manager'],
  '/public-procurement': ['root_admin', 'admin', 'project_manager'],
  '/service-dispatch': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/calendar': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/equipment-management': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/workflows': ['root_admin', 'admin', 'project_manager'],
  '/field-management': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],

  // Advanced Features
  '/smart-client-updates': ['root_admin', 'admin', 'project_manager'],
  '/material-orchestration': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/trade-handoff': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/ai-quality-control': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/workflow-management': ['root_admin', 'admin'],
  '/workflow-testing': ['root_admin', 'admin'],

  // Company Settings
  '/company-settings': ['root_admin', 'admin'],
  '/security-settings': ['root_admin', 'admin'],
  '/user-settings': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting', 'client_portal'],
  '/subscription-settings': ['root_admin', 'admin'],

  // Admin Routes
  '/admin/companies': ['root_admin'],
  '/admin/users': ['root_admin', 'admin'],
  '/admin/billing': ['root_admin', 'admin'],
  '/admin/promotions': ['root_admin', 'admin'],
  '/admin/analytics': ['root_admin', 'admin'],
  '/admin/settings': ['root_admin', 'admin'],
  '/admin/ai-models': ['root_admin'],
  '/admin/funnels': ['root_admin', 'admin'],
  '/admin/support-tickets': ['root_admin', 'admin'],
  '/admin/social-media': ['root_admin', 'admin'],
  '/admin/seo-management': ['root_admin', 'admin'],
  '/admin/search-traffic-dashboard': ['root_admin'],
  '/admin/search-traffic-dashboard/settings': ['root_admin'],

  // System Admin (Root Admin Only)
  '/system-admin/settings': ['root_admin'],
  '/security-monitoring': ['root_admin'],
  '/rate-limiting': ['root_admin'],
  '/blog-manager': ['root_admin', 'admin'],
  '/knowledge-base-admin': ['root_admin', 'admin'],

  // Tools & Resources
  '/tools': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
  '/resources': [], // Public
  '/schedule-builder': ['root_admin', 'admin', 'project_manager'],
  '/support': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
  '/knowledge-base': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],

  // Collaboration & Communication
  '/collaboration': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
  '/communication': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],

  // Marketplace
  '/marketplace': ['root_admin', 'admin'],

  // Mobile
  '/mobile-testing': ['root_admin'],
  '/mobile-dashboard': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
};

/**
 * Check if a user role has access to a route
 */
export function hasRouteAccess(route: string, userRole: UserRole): boolean {
  // Check exact match first
  if (ROUTE_ACCESS[route]) {
    return ROUTE_ACCESS[route].includes(userRole);
  }

  // Check pattern match for dynamic routes (e.g., /projects/:projectId)
  for (const [pattern, roles] of Object.entries(ROUTE_ACCESS)) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(route)) {
        return roles.includes(userRole);
      }
    }
  }

  // If no match found, check if it's a public route
  const publicRoutes = ['/', '/pricing', '/features', '/blog', '/faq', '/solutions', '/accessibility'];
  const isPublicRoute = publicRoutes.some(pub => route.startsWith(pub));

  return isPublicRoute;
}

/**
 * Get redirect path for unauthorized access
 */
export function getUnauthorizedRedirect(userRole: UserRole): string {
  if (userRole === 'client_portal') {
    return '/client-dashboard'; // TODO: Create client portal dashboard
  }
  return '/dashboard';
}

/**
 * Check if route requires authentication
 */
export function requiresAuth(route: string): boolean {
  const publicRoutes = [
    '/',
    '/pricing',
    '/features',
    '/blog',
    '/faq',
    '/solutions',
    '/accessibility',
    '/auth',
    '/login',
    '/plumbing-contractor-software',
    '/hvac-contractor-software',
    '/electrical-contractor-software',
    '/job-costing-software',
    '/construction-management-software',
    '/commercial-contractors',
    '/residential-contractors',
    '/procore-alternative',
    '/buildertrend-alternative',
    '/osha-compliance-software',
    '/construction-field-management',
    '/construction-scheduling-software',
    '/construction-project-management-software',
  ];

  return !publicRoutes.some(pub => route.startsWith(pub));
}
