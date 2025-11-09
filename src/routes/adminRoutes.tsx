/**
 * Admin & System Routes
 * Company settings, user management, billing, analytics, and system administration
 */

import { Route, Navigate } from 'react-router-dom';

// Company & Security
import CompanySettings from '@/pages/CompanySettings';
import SecuritySettings from '@/pages/SecuritySettings';
import SystemAdminSettings from '@/pages/SystemAdminSettings';
import SecurityMonitoring from '@/pages/SecurityMonitoring';
import RateLimitingDashboard from '@/pages/RateLimitingDashboard';

// User & Company Management
import Companies from '@/pages/admin/Companies';
import Users from '@/pages/admin/Users';
import { PermissionManagement } from '@/pages/admin/PermissionManagement';

// Billing & Revenue
import Billing from '@/pages/admin/Billing';
import Promotions from '@/pages/admin/Promotions';
import Upgrade from '@/pages/Upgrade';

// Analytics & Business Intelligence
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/admin/Settings';
import AdminIntelligenceDashboard from '@/pages/admin/AdminIntelligenceDashboard';
import { ConversionAnalytics } from '@/pages/admin/ConversionAnalytics';
import { RetentionAnalytics } from '@/pages/admin/RetentionAnalytics';
import { RevenueAnalytics } from '@/pages/admin/RevenueAnalytics';
import { ChurnPrediction } from '@/pages/admin/ChurnPrediction';

// SEO & Marketing
import UnifiedSEODashboard from '@/pages/UnifiedSEODashboard';
import SEODashboard from '@/pages/SEODashboard';
import SearchTrafficDashboard from '@/pages/admin/SearchTrafficDashboard';
import BlogManager from '@/pages/BlogManager';
import { SocialMediaManager } from '@/pages/admin/SocialMediaManager';
import { LeadManagement } from '@/pages/admin/LeadManagement';
import { DemoManagement } from '@/pages/admin/DemoManagement';
import FunnelManager from '@/pages/admin/FunnelManager';

// Knowledge & Support
import KnowledgeBaseAdmin from '@/pages/KnowledgeBaseAdmin';
import SupportTickets from '@/pages/admin/SupportTickets';
import SupportTicketsEnhanced from '@/pages/admin/SupportTicketsEnhanced';

// Multi-Tenant & Enterprise (Phase 4)
import { TenantManagement } from '@/pages/admin/TenantManagement';
import { SSOManagement } from '@/pages/admin/SSOManagement';
import { AuditLoggingCompliance } from '@/pages/admin/AuditLoggingCompliance';
import { GPSTimeTracking } from '@/pages/admin/GPSTimeTracking';

// API & Developer
import { APIKeyManagement } from '@/pages/admin/APIKeyManagement';
import { WebhookManagement } from '@/pages/admin/WebhookManagement';
import { DeveloperPortal } from '@/pages/admin/DeveloperPortal';

// AI & Intelligence (Phase 5)
import { AIEstimating } from '@/pages/admin/AIEstimating';
import { RiskPrediction } from '@/pages/admin/RiskPrediction';
import { AutoScheduling } from '@/pages/admin/AutoScheduling';
import { SafetyAutomation } from '@/pages/admin/SafetyAutomation';
import { SmartProcurement } from '@/pages/admin/SmartProcurement';
import { AdvancedDashboards } from '@/pages/admin/AdvancedDashboards';
import { ClientPortalPro } from '@/pages/admin/ClientPortalPro';
import { BillingAutomation } from '@/pages/admin/BillingAutomation';
import { ReportingEngine } from '@/pages/admin/ReportingEngine';
import AIModelManagerPage from '@/pages/admin/AIModelManager';

// Tools
import ScheduleBuilder from '@/pages/tools/ScheduleBuilder';
import AccessibilityPage from '@/pages/AccessibilityPage';

export const adminRoutes = (
  <>
    {/* Company Settings */}
    <Route path="/company-settings" element={<CompanySettings />} />
    <Route path="/security-settings" element={<SecuritySettings />} />
    <Route path="/system-admin/settings" element={<SystemAdminSettings />} />
    <Route path="/security-monitoring" element={<SecurityMonitoring />} />
    <Route path="/rate-limiting" element={<RateLimitingDashboard />} />

    {/* Admin - Users & Companies */}
    <Route path="/admin/companies" element={<Companies />} />
    <Route path="/admin/users" element={<Users />} />
    <Route path="/admin/permissions" element={<PermissionManagement />} />

    {/* Admin - Billing & Revenue */}
    <Route path="/admin/billing" element={<Billing />} />
    <Route path="/admin/promotions" element={<Promotions />} />
    <Route path="/upgrade" element={<Upgrade />} />

    {/* Admin - Analytics */}
    <Route path="/admin/intelligence" element={<AdminIntelligenceDashboard />} />
    <Route path="/admin/analytics" element={<Analytics />} />
    <Route path="/admin/settings" element={<Settings />} />
    <Route path="/admin/conversion-analytics" element={<ConversionAnalytics />} />
    <Route path="/admin/retention-analytics" element={<RetentionAnalytics />} />
    <Route path="/admin/revenue-analytics" element={<RevenueAnalytics />} />
    <Route path="/admin/churn-prediction" element={<ChurnPrediction />} />

    {/* Admin - Marketing & SEO */}
    <Route path="/admin/seo" element={<SEODashboard />} />
    <Route path="/admin/seo-management" element={<UnifiedSEODashboard />} />
    <Route path="/admin/search-traffic-dashboard" element={<SearchTrafficDashboard />} />
    <Route path="/admin/seo-analytics" element={<Navigate to="/admin/seo-management" replace />} />
    <Route path="/admin/seo-analytics-legacy" element={<Navigate to="/admin/seo-management" replace />} />
    <Route path="/seo-management" element={<Navigate to="/admin/seo-management" replace />} />
    <Route path="/blog-manager" element={<BlogManager />} />
    <Route path="/admin/social-media" element={<SocialMediaManager />} />
    <Route path="/admin/leads" element={<LeadManagement />} />
    <Route path="/admin/demos" element={<DemoManagement />} />
    <Route path="/admin/funnels" element={<FunnelManager />} />

    {/* Admin - Knowledge & Support */}
    <Route path="/knowledge-base-admin" element={<KnowledgeBaseAdmin />} />
    <Route path="/admin/support-tickets" element={<SupportTicketsEnhanced />} />
    <Route path="/admin/support-tickets-legacy" element={<SupportTickets />} />

    {/* Admin - Multi-Tenant & Enterprise */}
    <Route path="/admin/tenants" element={<TenantManagement />} />
    <Route path="/admin/sso" element={<SSOManagement />} />
    <Route path="/admin/audit" element={<AuditLoggingCompliance />} />
    <Route path="/admin/gps-tracking" element={<GPSTimeTracking />} />

    {/* Admin - API & Developer */}
    <Route path="/admin/api-keys" element={<APIKeyManagement />} />
    <Route path="/admin/webhooks" element={<WebhookManagement />} />
    <Route path="/admin/developer-portal" element={<DeveloperPortal />} />

    {/* Admin - AI & Intelligence */}
    <Route path="/admin/ai-estimating" element={<AIEstimating />} />
    <Route path="/admin/risk-prediction" element={<RiskPrediction />} />
    <Route path="/admin/auto-scheduling" element={<AutoScheduling />} />
    <Route path="/admin/safety-automation" element={<SafetyAutomation />} />
    <Route path="/admin/smart-procurement" element={<SmartProcurement />} />
    <Route path="/admin/advanced-dashboards" element={<AdvancedDashboards />} />
    <Route path="/admin/client-portal-pro" element={<ClientPortalPro />} />
    <Route path="/admin/billing-automation" element={<BillingAutomation />} />
    <Route path="/admin/reporting-engine" element={<ReportingEngine />} />
    <Route path="/admin/ai-models" element={<AIModelManagerPage />} />

    {/* Tools & Utilities */}
    <Route path="/schedule-builder" element={<ScheduleBuilder />} />
    <Route path="/accessibility" element={<AccessibilityPage />} />
  </>
);
