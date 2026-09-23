/**
 * Route Configuration for Brikly
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
 * Route access control configuration: which roles may open each route.
 *
 * Enforced by RouteGuard (src/components/ProtectedRoute.tsx) and read by
 * usePermissions().canAccessRoute for the sidebar, so this is the one table.
 * A route not listed here stays open to every signed-in role. Every role the
 * navigation configs show a link to must be listed on that link's route;
 * src/routes/__tests__/routeAccess.test.tsx fails if they drift apart.
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
  '/my-tasks': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],

  // Hub Pages
  '/projects-hub': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
  '/financial-hub': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/people-hub': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/operations-hub': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
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
  '/punch-list': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
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
  '/estimates': ['root_admin', 'admin', 'project_manager', 'office_staff', 'accounting'],
  // field_supervisor and office_staff reach this from the dashboard's View Reports quick action.
  '/reports': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],
  '/purchase-orders': ['root_admin', 'admin', 'project_manager', 'office_staff', 'accounting'],
  '/vendors': ['root_admin', 'admin', 'project_manager', 'office_staff', 'accounting'],
  '/quickbooks-routing': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/payment-center': ['root_admin', 'admin', 'accounting'],

  // People & Team
  '/team': ['root_admin', 'admin', 'project_manager'],
  '/crew-scheduling': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/time-tracking': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],

  // CRM (People Hub)
  '/crm': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/crm/leads': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/crm/contacts': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/crm/opportunities': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/crm/pipeline': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/crm/lead-intelligence': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/crm/workflows': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/crm/campaigns': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/crm/analytics': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/email-marketing': ['root_admin', 'admin', 'office_staff'],

  // Operations
  '/safety': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/compliance-audit': ['root_admin', 'admin'],
  '/gdpr-compliance': ['root_admin', 'admin'],
  '/permit-management': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/environmental-permitting': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/bond-insurance': ['root_admin', 'admin', 'project_manager', 'accounting'],
  '/warranty-management': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/public-procurement': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/service-dispatch': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],
  '/calendar': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/equipment-management': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/workflows': ['root_admin', 'admin', 'project_manager'],
  '/field-management': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff'],

  // Advanced Features
  '/smart-client-updates': ['root_admin', 'admin', 'project_manager'],
  '/material-orchestration': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/trade-handoff': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/ai-quality-control': ['root_admin', 'admin', 'project_manager', 'field_supervisor'],
  '/workflow-management': ['root_admin', 'admin', 'project_manager', 'office_staff'],
  '/workflow-testing': ['root_admin', 'admin'],

  // Company Settings
  '/company-settings': ['root_admin', 'admin'],
  '/security-settings': ['root_admin', 'admin'],
  '/user-settings': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting', 'client_portal'],
  '/subscription-settings': ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'],

  // Admin Routes
  '/admin/companies': ['root_admin'],
  '/admin/users': ['root_admin', 'admin'],
  '/admin/disposable-email-domains': ['root_admin'],
  '/admin/billing': ['root_admin', 'admin'],
  '/admin/promotions': ['root_admin', 'admin'],
  '/admin/analytics': ['root_admin', 'admin'],
  '/admin/settings': ['root_admin', 'admin'],
  '/admin/ai-models': ['root_admin', 'admin'],
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
 * The roles ROUTE_ACCESS lists for a pathname, or undefined when it lists
 * none. Exact entries win; otherwise a `:param` pattern such as
 * /projects/:projectId matches one path segment. An entry with an empty
 * list is a public page and is reported as undefined too, because it
 * restricts nobody.
 */
export function getRouteRoles(pathname: string): UserRole[] | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  let roles: UserRole[] | undefined = ROUTE_ACCESS[path];
  if (!roles) {
    for (const [pattern, patternRoles] of Object.entries(ROUTE_ACCESS)) {
      if (!pattern.includes(':')) continue;
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(path)) {
        roles = patternRoles;
        break;
      }
    }
  }
  return roles && roles.length > 0 ? roles : undefined;
}

/**
 * Whether a role may open a pathname. This is the decision RouteGuard
 * enforces (US-302), and what the sidebar uses to lock links, so the two
 * cannot disagree.
 *
 * A route ROUTE_ACCESS does not list stays open to every signed-in role, as
 * every RouteGuard route was before this table was enforced: failing closed
 * on the ~100 unlisted routes would lock people out of pages they use today.
 * The client_portal restriction to portal pages is separate and lives in
 * RouteGuard (portalScoped).
 */
export function hasRouteAccess(route: string, userRole: UserRole): boolean {
  const roles = getRouteRoles(route);
  return roles ? roles.includes(userRole) : true;
}

/**
 * Where to send a role that opened a route it may not use: its own home.
 * Every role except client_portal is listed on /dashboard.
 */
export function getUnauthorizedRedirect(userRole: UserRole): string {
  if (userRole === 'client_portal') {
    return '/client-portal';
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
