/**
 * Admin & System Routes
 * Company settings, user management, billing, analytics, and system administration
 *
 * ⚡ Performance: All admin routes are lazy-loaded to reduce initial bundle size
 * Most users are field workers/contractors and don't access admin features,
 * so we load this code only when needed.
 *
 * 🔒 Security: Defense-in-Depth Protection
 * - Layer 1: Authentication (requireAuth)
 * - Layer 2: Authorization (allowedRoles, permissions)
 * - Layer 3: Resource Ownership (via SecureRoute)
 * - Layer 4: Database RLS (PostgreSQL policies)
 */

import { Route, Navigate } from 'react-router-dom';
import { SecureRoute } from '@/components/security/SecureRoute';
import {
  // Company & Security
  LazyCompanySettings,
  LazySecuritySettings,
  LazySystemAdminSettings,
  LazySecurityMonitoring,
  LazyRateLimitingDashboard,

  // User & Company Management
  LazyCompanies,
  LazyUsers,
  LazyPermissionManagement,

  // Billing & Revenue
  LazyBilling,
  LazyPromotions,
  LazyUpgrade,

  // Analytics & Business Intelligence
  LazyAnalytics,
  LazySettings,
  LazyAdminIntelligenceDashboard,
  LazyConversionAnalytics,
  LazyRetentionAnalytics,
  LazyRevenueAnalytics,
  LazyChurnPrediction,

  // SEO & Marketing
  LazyUnifiedSEODashboard,
  LazySEODashboard,
  LazySearchTrafficDashboard,
  LazyBlogManager,
  LazySocialMediaManager,
  LazyLeadManagementAdmin,
  LazyDemoManagement,
  LazyFunnelManager,

  // Knowledge & Support
  LazyKnowledgeBaseAdmin,
  LazySupportTickets,
  LazySupportTicketsEnhanced,

  // Multi-Tenant & Enterprise
  LazyTenantManagement,
  LazySSOManagement,
  LazyAuditLoggingCompliance,
  LazyGPSTimeTracking,

  // API & Developer
  LazyAPIKeyManagement,
  LazyWebhookManagement,
  LazyDeveloperPortal,

  // AI & Intelligence
  LazyAIEstimating,
  LazyRiskPrediction,
  LazyAutoScheduling,
  LazySafetyAutomation,
  LazySmartProcurement,
  LazyAdvancedDashboards,
  LazyClientPortalPro,
  LazyBillingAutomation,
  LazyReportingEngine,
  LazyAIModelManagerPage,

  // Tools
  LazyScheduleBuilder,
  LazyAccessibilityPage,
  LazyAccessibilityStatement,
} from '@/utils/lazyRoutes';

export const adminRoutes = (
  <>
    {/* ================================================================
        COMPANY SETTINGS - Admin & Project Manager access
        Security: Layer 2 (role-based authorization)
        ================================================================ */}
    <Route
      path="/company-settings"
      element={
        <SecureRoute
          requireAuth
          permissions={['settings.read']}
          allowedRoles={['root_admin', 'admin', 'project_manager']}
        >
          <LazyCompanySettings />
        </SecureRoute>
      }
    />
    <Route
      path="/security-settings"
      element={
        <SecureRoute
          requireAuth
          permissions={['settings.write']}
          allowedRoles={['root_admin', 'admin']}
        >
          <LazySecuritySettings />
        </SecureRoute>
      }
    />
    <Route
      path="/system-admin/settings"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin']}>
          <LazySystemAdminSettings />
        </SecureRoute>
      }
    />
    <Route
      path="/security-monitoring"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazySecurityMonitoring />
        </SecureRoute>
      }
    />
    <Route
      path="/rate-limiting"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyRateLimitingDashboard />
        </SecureRoute>
      }
    />

    {/* ================================================================
        ADMIN - Users & Companies
        Security: Layer 2 (admin-only authorization)
        ================================================================ */}
    <Route
      path="/admin/companies"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyCompanies />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/users"
      element={
        <SecureRoute
          requireAuth
          permissions={['users.read']}
          allowedRoles={['root_admin', 'admin']}
        >
          <LazyUsers />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/permissions"
      element={
        <SecureRoute
          requireAuth
          permissions={['users.write']}
          allowedRoles={['root_admin', 'admin']}
        >
          <LazyPermissionManagement />
        </SecureRoute>
      }
    />

    {/* ================================================================
        ADMIN - Billing & Revenue
        Security: Layer 2 (admin-only authorization)
        ================================================================ */}
    <Route
      path="/admin/billing"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyBilling />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/promotions"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyPromotions />
        </SecureRoute>
      }
    />
    <Route
      path="/upgrade"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyUpgrade />
        </SecureRoute>
      }
    />

    {/* ================================================================
        ADMIN - Analytics
        Security: Layer 2 (admin-only authorization)
        ================================================================ */}
    <Route
      path="/admin/intelligence"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyAdminIntelligenceDashboard />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/analytics"
      element={
        <SecureRoute
          requireAuth
          permissions={['reports.read']}
          allowedRoles={['root_admin', 'admin']}
        >
          <LazyAnalytics />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/settings"
      element={
        <SecureRoute
          requireAuth
          permissions={['settings.write']}
          allowedRoles={['root_admin', 'admin']}
        >
          <LazySettings />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/conversion-analytics"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyConversionAnalytics />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/retention-analytics"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyRetentionAnalytics />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/revenue-analytics"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyRevenueAnalytics />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/churn-prediction"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyChurnPrediction />
        </SecureRoute>
      }
    />

    {/* ================================================================
        ADMIN - Marketing & SEO
        Security: Layer 2 (admin-only authorization)
        ================================================================ */}
    <Route
      path="/admin/seo"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazySEODashboard />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/seo-management"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyUnifiedSEODashboard />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/search-traffic-dashboard"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazySearchTrafficDashboard />
        </SecureRoute>
      }
    />
    <Route path="/admin/seo-analytics" element={<Navigate to="/admin/seo-management" replace />} />
    <Route path="/admin/seo-analytics-legacy" element={<Navigate to="/admin/seo-management" replace />} />
    <Route path="/seo-management" element={<Navigate to="/admin/seo-management" replace />} />
    <Route
      path="/blog-manager"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyBlogManager />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/social-media"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazySocialMediaManager />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/leads"
      element={
        <SecureRoute
          requireAuth
          permissions={['crm.read']}
          allowedRoles={['root_admin', 'admin']}
        >
          <LazyLeadManagementAdmin />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/demos"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyDemoManagement />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/funnels"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyFunnelManager />
        </SecureRoute>
      }
    />

    {/* ================================================================
        ADMIN - Knowledge & Support
        Security: Layer 2 (admin-only authorization)
        ================================================================ */}
    <Route
      path="/knowledge-base-admin"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyKnowledgeBaseAdmin />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/support-tickets"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazySupportTicketsEnhanced />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/support-tickets-legacy"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazySupportTickets />
        </SecureRoute>
      }
    />

    {/* ================================================================
        ADMIN - Multi-Tenant & Enterprise
        Security: Layer 2 (strict admin authorization)
        ================================================================ */}
    <Route
      path="/admin/tenants"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin']}>
          <LazyTenantManagement />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/sso"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazySSOManagement />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/audit"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyAuditLoggingCompliance />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/gps-tracking"
      element={
        <SecureRoute
          requireAuth
          allowedRoles={['root_admin', 'admin', 'project_manager']}
        >
          <LazyGPSTimeTracking />
        </SecureRoute>
      }
    />

    {/* ================================================================
        ADMIN - API & Developer
        Security: Layer 2 (admin-only authorization)
        ================================================================ */}
    <Route
      path="/admin/api-keys"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyAPIKeyManagement />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/webhooks"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyWebhookManagement />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/developer-portal"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyDeveloperPortal />
        </SecureRoute>
      }
    />

    {/* ================================================================
        ADMIN - AI & Intelligence
        Security: Layer 2 (admin-only authorization)
        ================================================================ */}
    <Route
      path="/admin/ai-estimating"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyAIEstimating />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/risk-prediction"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyRiskPrediction />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/auto-scheduling"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyAutoScheduling />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/safety-automation"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazySafetyAutomation />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/smart-procurement"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazySmartProcurement />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/advanced-dashboards"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyAdvancedDashboards />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/client-portal-pro"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyClientPortalPro />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/billing-automation"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin', 'admin']}>
          <LazyBillingAutomation />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/reporting-engine"
      element={
        <SecureRoute
          requireAuth
          permissions={['reports.read']}
          allowedRoles={['root_admin', 'admin']}
        >
          <LazyReportingEngine />
        </SecureRoute>
      }
    />
    <Route
      path="/admin/ai-models"
      element={
        <SecureRoute requireAuth allowedRoles={['root_admin']}>
          <LazyAIModelManagerPage />
        </SecureRoute>
      }
    />

    {/* ================================================================
        TOOLS & UTILITIES
        Some are public (accessibility), others require auth
        ================================================================ */}
    <Route
      path="/schedule-builder"
      element={
        <SecureRoute
          requireAuth
          permissions={['schedule.write']}
          allowedRoles={['root_admin', 'admin', 'project_manager']}
        >
          <LazyScheduleBuilder />
        </SecureRoute>
      }
    />
    {/* Accessibility pages are public - no auth required */}
    <Route path="/accessibility" element={<LazyAccessibilityPage />} />
    <Route path="/accessibility-statement" element={<LazyAccessibilityStatement />} />
  </>
);
