/**
 * Admin & System Routes
 * Company settings, user management, billing, analytics, and system administration
 *
 * ⚡ Performance: All admin routes are lazy-loaded to reduce initial bundle size
 * Most users are field workers/contractors and don't access admin features,
 * so we load this code only when needed.
 */

import { Route, Navigate } from 'react-router-dom';
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
} from '@/utils/lazyRoutes';

export const adminRoutes = (
  <>
    {/* Company Settings */}
    <Route path="/company-settings" element={<LazyCompanySettings />} />
    <Route path="/security-settings" element={<LazySecuritySettings />} />
    <Route path="/system-admin/settings" element={<LazySystemAdminSettings />} />
    <Route path="/security-monitoring" element={<LazySecurityMonitoring />} />
    <Route path="/rate-limiting" element={<LazyRateLimitingDashboard />} />

    {/* Admin - Users & Companies */}
    <Route path="/admin/companies" element={<LazyCompanies />} />
    <Route path="/admin/users" element={<LazyUsers />} />
    <Route path="/admin/permissions" element={<LazyPermissionManagement />} />

    {/* Admin - Billing & Revenue */}
    <Route path="/admin/billing" element={<LazyBilling />} />
    <Route path="/admin/promotions" element={<LazyPromotions />} />
    <Route path="/upgrade" element={<LazyUpgrade />} />

    {/* Admin - Analytics */}
    <Route path="/admin/intelligence" element={<LazyAdminIntelligenceDashboard />} />
    <Route path="/admin/analytics" element={<LazyAnalytics />} />
    <Route path="/admin/settings" element={<LazySettings />} />
    <Route path="/admin/conversion-analytics" element={<LazyConversionAnalytics />} />
    <Route path="/admin/retention-analytics" element={<LazyRetentionAnalytics />} />
    <Route path="/admin/revenue-analytics" element={<LazyRevenueAnalytics />} />
    <Route path="/admin/churn-prediction" element={<LazyChurnPrediction />} />

    {/* Admin - Marketing & SEO */}
    <Route path="/admin/seo" element={<LazySEODashboard />} />
    <Route path="/admin/seo-management" element={<LazyUnifiedSEODashboard />} />
    <Route path="/admin/search-traffic-dashboard" element={<LazySearchTrafficDashboard />} />
    <Route path="/admin/seo-analytics" element={<Navigate to="/admin/seo-management" replace />} />
    <Route path="/admin/seo-analytics-legacy" element={<Navigate to="/admin/seo-management" replace />} />
    <Route path="/seo-management" element={<Navigate to="/admin/seo-management" replace />} />
    <Route path="/blog-manager" element={<LazyBlogManager />} />
    <Route path="/admin/social-media" element={<LazySocialMediaManager />} />
    <Route path="/admin/leads" element={<LazyLeadManagementAdmin />} />
    <Route path="/admin/demos" element={<LazyDemoManagement />} />
    <Route path="/admin/funnels" element={<LazyFunnelManager />} />

    {/* Admin - Knowledge & Support */}
    <Route path="/knowledge-base-admin" element={<LazyKnowledgeBaseAdmin />} />
    <Route path="/admin/support-tickets" element={<LazySupportTicketsEnhanced />} />
    <Route path="/admin/support-tickets-legacy" element={<LazySupportTickets />} />

    {/* Admin - Multi-Tenant & Enterprise */}
    <Route path="/admin/tenants" element={<LazyTenantManagement />} />
    <Route path="/admin/sso" element={<LazySSOManagement />} />
    <Route path="/admin/audit" element={<LazyAuditLoggingCompliance />} />
    <Route path="/admin/gps-tracking" element={<LazyGPSTimeTracking />} />

    {/* Admin - API & Developer */}
    <Route path="/admin/api-keys" element={<LazyAPIKeyManagement />} />
    <Route path="/admin/webhooks" element={<LazyWebhookManagement />} />
    <Route path="/admin/developer-portal" element={<LazyDeveloperPortal />} />

    {/* Admin - AI & Intelligence */}
    <Route path="/admin/ai-estimating" element={<LazyAIEstimating />} />
    <Route path="/admin/risk-prediction" element={<LazyRiskPrediction />} />
    <Route path="/admin/auto-scheduling" element={<LazyAutoScheduling />} />
    <Route path="/admin/safety-automation" element={<LazySafetyAutomation />} />
    <Route path="/admin/smart-procurement" element={<LazySmartProcurement />} />
    <Route path="/admin/advanced-dashboards" element={<LazyAdvancedDashboards />} />
    <Route path="/admin/client-portal-pro" element={<LazyClientPortalPro />} />
    <Route path="/admin/billing-automation" element={<LazyBillingAutomation />} />
    <Route path="/admin/reporting-engine" element={<LazyReportingEngine />} />
    <Route path="/admin/ai-models" element={<LazyAIModelManagerPage />} />

    {/* Tools & Utilities */}
    <Route path="/schedule-builder" element={<LazyScheduleBuilder />} />
    <Route path="/accessibility" element={<LazyAccessibilityPage />} />
  </>
);
