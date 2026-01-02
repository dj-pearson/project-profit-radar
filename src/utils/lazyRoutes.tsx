import { lazy } from 'react';
import { LoadingState } from '@/components/ui/loading-spinner';

/**
 * Utility for creating lazy-loaded route components with consistent loading states
 */
export const createLazyRoute = (importFn: () => Promise<{ default: React.ComponentType<any> }>) => {
  return lazy(importFn);
};

/**
 * Common loading component for all lazy routes
 */
export const RouteLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingState message="Loading page..." />
  </div>
);

// Lazy load all major route components
export const LazyIndex = createLazyRoute(() => import('@/pages/Index'));
export const LazyAuth = createLazyRoute(() => import('@/pages/Auth'));
export const LazySetup = createLazyRoute(() => import('@/pages/Setup'));
export const LazyCheckoutSuccess = createLazyRoute(() => import('@/pages/CheckoutSuccess'));
export const LazyPaymentSuccess = createLazyRoute(() => import('@/pages/PaymentSuccess'));
export const LazyPaymentCancelled = createLazyRoute(() => import('@/pages/PaymentCancelled'));
export const LazyDashboard = createLazyRoute(() => import('@/pages/Dashboard'));

// Hub pages
export const LazyProjectsHub = createLazyRoute(() => import('@/pages/hubs/ProjectsHub'));
export const LazyFinancialHub = createLazyRoute(() => import('@/pages/hubs/FinancialHub'));
export const LazyPeopleHub = createLazyRoute(() => import('@/pages/hubs/PeopleHub'));
export const LazyOperationsHub = createLazyRoute(() => import('@/pages/hubs/OperationsHub'));
export const LazyAdminHub = createLazyRoute(() => import('@/pages/hubs/AdminHub'));

// Project area pages
export const LazyProjects = createLazyRoute(() => import('@/pages/Projects'));
export const LazyProjectDetail = createLazyRoute(() => import('@/pages/ProjectDetail'));
export const LazyCreateProject = createLazyRoute(() => import('@/pages/CreateProject'));
export const LazyScheduleManagement = createLazyRoute(() => import('@/pages/ScheduleManagement'));
export const LazyJobCosting = createLazyRoute(() => import('@/pages/JobCosting'));
export const LazyDailyReports = createLazyRoute(() => import('@/pages/DailyReports'));
export const LazyRFIs = createLazyRoute(() => import('@/pages/RFIs'));
export const LazySubmittals = createLazyRoute(() => import('@/pages/Submittals'));
export const LazyChangeOrders = createLazyRoute(() => import('@/pages/ChangeOrders'));
export const LazyPunchList = createLazyRoute(() => import('@/pages/PunchList'));
export const LazyDocumentManagement = createLazyRoute(() => import('@/pages/DocumentManagement'));
export const LazyMaterials = createLazyRoute(() => import('@/pages/Materials'));
export const LazyMaterialTracking = createLazyRoute(() => import('@/pages/MaterialTracking'));
export const LazyEquipment = createLazyRoute(() => import('@/pages/Equipment'));

// Financial area pages
export const LazyFinancialDashboard = createLazyRoute(() => import('@/pages/FinancialDashboard'));
export const LazyEstimatesHub = createLazyRoute(() => import('@/pages/EstimatesHub'));
export const LazyReports = createLazyRoute(() => import('@/pages/Reports'));
export const LazyPurchaseOrders = createLazyRoute(() => import('@/pages/PurchaseOrders'));
export const LazyVendors = createLazyRoute(() => import('@/pages/Vendors'));
export const LazyQuickBooksRouting = createLazyRoute(() => import('@/pages/QuickBooksRouting'));
export const LazyQuickBooksCallback = createLazyRoute(() => import('@/pages/QuickBooksCallback'));
export const LazyInvoices = createLazyRoute(() => import('@/pages/Invoices'));
export const LazyExpenses = createLazyRoute(() => import('@/pages/Expenses'));
export const LazyBudgetManagement = createLazyRoute(() => import('@/pages/BudgetManagement'));
export const LazyFinancialReports = createLazyRoute(() => import('@/pages/FinancialReports'));
export const LazyTaxManagement = createLazyRoute(() => import('@/pages/TaxManagement'));

// CRM area pages
export const LazyCRMDashboard = createLazyRoute(() => import('@/pages/CRMDashboard'));
export const LazyLeadManagement = createLazyRoute(() => import('@/pages/LeadManagement'));
export const LazyContactManagement = createLazyRoute(() => import('@/pages/ContactManagement'));

// Operations pages
export const LazyInventoryManagement = createLazyRoute(() => import('@/pages/InventoryManagement'));
export const LazyVendorManagement = createLazyRoute(() => import('@/pages/VendorManagement'));
export const LazyQualityControl = createLazyRoute(() => import('@/pages/QualityControl'));
export const LazySafetyManagement = createLazyRoute(() => import('@/pages/SafetyManagement'));

// People & HR pages
export const LazyEmployeeManagement = createLazyRoute(() => import('@/pages/EmployeeManagement'));
export const LazyTimeTracking = createLazyRoute(() => import('@/pages/TimeTracking'));
export const LazyPayroll = createLazyRoute(() => import('@/pages/Payroll'));
export const LazyPerformanceReviews = createLazyRoute(() => import('@/pages/PerformanceReviews'));

// Admin pages
export const LazyCompanySettings = createLazyRoute(() => import('@/pages/CompanySettings'));
export const LazyUserManagement = createLazyRoute(() => import('@/pages/UserManagement'));
export const LazyIntegrations = createLazyRoute(() => import('@/pages/Integrations'));
export const LazyAuditLogs = createLazyRoute(() => import('@/pages/AuditLogs'));
export const LazyBackupRestore = createLazyRoute(() => import('@/pages/BackupRestore'));

// Admin - Company & Security
export const LazySecuritySettings = createLazyRoute(() => import('@/pages/SecuritySettings'));
export const LazySystemAdminSettings = createLazyRoute(() => import('@/pages/SystemAdminSettings'));
export const LazySecurityMonitoring = createLazyRoute(() => import('@/pages/SecurityMonitoring'));
export const LazyRateLimitingDashboard = createLazyRoute(() => import('@/pages/RateLimitingDashboard'));

// Admin - User & Company Management
export const LazyCompanies = createLazyRoute(() => import('@/pages/admin/Companies'));
export const LazyUsers = createLazyRoute(() => import('@/pages/admin/Users'));
export const LazyPermissionManagement = createLazyRoute(() => import('@/pages/admin/PermissionManagement'));

// Admin - Billing & Revenue
export const LazyBilling = createLazyRoute(() => import('@/pages/admin/Billing'));
export const LazyPromotions = createLazyRoute(() => import('@/pages/admin/Promotions'));
export const LazyUpgrade = createLazyRoute(() => import('@/pages/Upgrade'));

// Admin - Analytics & Business Intelligence
export const LazyAnalytics = createLazyRoute(() => import('@/pages/Analytics'));
export const LazySettings = createLazyRoute(() => import('@/pages/admin/Settings'));
export const LazyAdminIntelligenceDashboard = createLazyRoute(() => import('@/pages/admin/AdminIntelligenceDashboard'));
export const LazyConversionAnalytics = createLazyRoute(() => import('@/pages/admin/ConversionAnalytics'));
export const LazyRetentionAnalytics = createLazyRoute(() => import('@/pages/admin/RetentionAnalytics'));
export const LazyRevenueAnalytics = createLazyRoute(() => import('@/pages/admin/RevenueAnalytics'));
export const LazyChurnPrediction = createLazyRoute(() => import('@/pages/admin/ChurnPrediction'));

// Admin - SEO & Marketing
export const LazyUnifiedSEODashboard = createLazyRoute(() => import('@/pages/UnifiedSEODashboard'));
export const LazySEODashboard = createLazyRoute(() => import('@/pages/SEODashboard'));
export const LazySearchTrafficDashboard = createLazyRoute(() => import('@/pages/admin/SearchTrafficDashboard'));
export const LazyBlogManager = createLazyRoute(() => import('@/pages/BlogManager'));
export const LazySocialMediaManager = createLazyRoute(() => import('@/pages/admin/SocialMediaManager'));
export const LazyLeadManagementAdmin = createLazyRoute(() => import('@/pages/admin/LeadManagement'));
export const LazyDemoManagement = createLazyRoute(() => import('@/pages/admin/DemoManagement'));
export const LazyFunnelManager = createLazyRoute(() => import('@/pages/admin/FunnelManager'));

// Admin - Knowledge & Support
export const LazyKnowledgeBaseAdmin = createLazyRoute(() => import('@/pages/KnowledgeBaseAdmin'));
export const LazySupportTickets = createLazyRoute(() => import('@/pages/admin/SupportTickets'));
export const LazySupportTicketsEnhanced = createLazyRoute(() => import('@/pages/admin/SupportTicketsEnhanced'));

// Admin - Multi-Tenant & Enterprise
export const LazyTenantManagement = createLazyRoute(() => import('@/pages/admin/TenantManagement'));
export const LazySSOManagement = createLazyRoute(() => import('@/pages/admin/SSOManagement'));
export const LazyAuditLoggingCompliance = createLazyRoute(() => import('@/pages/admin/AuditLoggingCompliance'));
export const LazyGPSTimeTracking = createLazyRoute(() => import('@/pages/admin/GPSTimeTracking'));

// Admin - API & Developer
export const LazyAPIKeyManagement = createLazyRoute(() => import('@/pages/admin/APIKeyManagement'));
export const LazyWebhookManagement = createLazyRoute(() => import('@/pages/admin/WebhookManagement'));
export const LazyDeveloperPortal = createLazyRoute(() => import('@/pages/admin/DeveloperPortal'));

// Admin - AI & Intelligence
export const LazyAIEstimating = createLazyRoute(() => import('@/pages/admin/AIEstimating'));
export const LazyRiskPrediction = createLazyRoute(() => import('@/pages/admin/RiskPrediction'));
export const LazyAutoScheduling = createLazyRoute(() => import('@/pages/admin/AutoScheduling'));
export const LazySafetyAutomation = createLazyRoute(() => import('@/pages/admin/SafetyAutomation'));
export const LazySmartProcurement = createLazyRoute(() => import('@/pages/admin/SmartProcurement'));
export const LazyAdvancedDashboards = createLazyRoute(() => import('@/pages/admin/AdvancedDashboards'));
export const LazyClientPortalPro = createLazyRoute(() => import('@/pages/admin/ClientPortalPro'));
export const LazyBillingAutomation = createLazyRoute(() => import('@/pages/admin/BillingAutomation'));
export const LazyReportingEngine = createLazyRoute(() => import('@/pages/admin/ReportingEngine'));
export const LazyAIModelManagerPage = createLazyRoute(() => import('@/pages/admin/AIModelManager'));

// Admin - Tools
export const LazyScheduleBuilder = createLazyRoute(() => import('@/pages/tools/ScheduleBuilder'));
export const LazyAccessibilityPage = createLazyRoute(() => import('@/pages/AccessibilityPage'));

// Utility and settings pages
export const LazyMyTasks = createLazyRoute(() => import('@/pages/MyTasks'));
export const LazyUserSettings = createLazyRoute(() => import('@/pages/UserSettings'));
export const LazySubscriptionSettings = createLazyRoute(() => import('@/pages/SubscriptionSettings'));
export const LazyAPIMarketplace = createLazyRoute(() => import('@/pages/APIMarketplace'));
export const LazyCollaboration = createLazyRoute(() => import('@/pages/Collaboration'));
export const LazyMobileTesting = createLazyRoute(() => import('@/pages/MobileTesting'));
export const LazyMobileDashboard = createLazyRoute(() => import('@/pages/MobileDashboard'));
export const LazyFieldManagement = createLazyRoute(() => import('@/pages/FieldManagement'));
export const LazyWorkflowManagement = createLazyRoute(() => import('@/pages/WorkflowManagement'));
export const LazyWorkflowTesting = createLazyRoute(() => import('@/pages/WorkflowTesting'));
export const LazyResources = createLazyRoute(() => import('@/pages/Resources'));
export const LazyTools = createLazyRoute(() => import('@/pages/Tools'));
export const LazyBlogPost = createLazyRoute(() => import('@/pages/BlogPost'));

// Task-specific pages
export const LazyProjectTaskCreate = createLazyRoute(() => import('@/pages/ProjectTaskCreate'));

/**
 * Route configuration with lazy loading and preloading hints
 */
export interface LazyRouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  preload?: boolean; // Whether to preload this route
  chunkName?: string; // Custom chunk name for webpack
}

export const lazyRouteConfigs: LazyRouteConfig[] = [
  // High priority routes (preload)
  { path: '/', component: LazyIndex, preload: true },
  { path: '/auth', component: LazyAuth, preload: true },
  { path: '/dashboard', component: LazyDashboard, preload: true },
  
  // Hub pages (medium priority)
  { path: '/projects-hub', component: LazyProjectsHub },
  { path: '/financial-hub', component: LazyFinancialHub },
  { path: '/people-hub', component: LazyPeopleHub },
  { path: '/operations-hub', component: LazyOperationsHub },
  { path: '/admin-hub', component: LazyAdminHub },
  
  // Project pages (high usage)
  { path: '/projects', component: LazyProjects, preload: true },
  { path: '/projects/:projectId', component: LazyProjectDetail },
  { path: '/projects/new', component: LazyCreateProject },
  
  // All other routes (load on demand)
  { path: '/schedule', component: LazyScheduleManagement },
  { path: '/job-costing', component: LazyJobCosting },
  { path: '/daily-reports', component: LazyDailyReports },
  { path: '/rfis', component: LazyRFIs },
  { path: '/submittals', component: LazySubmittals },
  { path: '/change-orders', component: LazyChangeOrders },
  { path: '/punch-list', component: LazyPunchList },
  { path: '/documents', component: LazyDocumentManagement },
  { path: '/materials', component: LazyMaterials },
  { path: '/material-tracking', component: LazyMaterialTracking },
  { path: '/equipment', component: LazyEquipment },
  
  // Financial pages
  { path: '/invoices', component: LazyInvoices },
  { path: '/expenses', component: LazyExpenses },
  { path: '/budget', component: LazyBudgetManagement },
  { path: '/financial-reports', component: LazyFinancialReports },
  { path: '/tax-management', component: LazyTaxManagement },
  
  // CRM pages
  { path: '/crm', component: LazyCRMDashboard },
  { path: '/leads', component: LazyLeadManagement },
  { path: '/contacts', component: LazyContactManagement },
  
  // Operations pages
  { path: '/inventory', component: LazyInventoryManagement },
  { path: '/vendors', component: LazyVendorManagement },
  { path: '/quality', component: LazyQualityControl },
  { path: '/safety', component: LazySafetyManagement },
  
  // People & HR pages
  { path: '/employees', component: LazyEmployeeManagement },
  { path: '/time-tracking', component: LazyTimeTracking },
  { path: '/payroll', component: LazyPayroll },
  { path: '/performance', component: LazyPerformanceReviews },
  
  // Admin pages
  { path: '/company-settings', component: LazyCompanySettings },
  { path: '/user-management', component: LazyUserManagement },
  { path: '/integrations', component: LazyIntegrations },
  { path: '/audit-logs', component: LazyAuditLogs },
  { path: '/backup-restore', component: LazyBackupRestore },
  
  // Utility pages
  { path: '/my-tasks', component: LazyMyTasks },
  { path: '/settings', component: LazyUserSettings },
  { path: '/subscription', component: LazySubscriptionSettings },
  { path: '/marketplace', component: LazyAPIMarketplace },
  { path: '/collaboration', component: LazyCollaboration },
  { path: '/mobile-testing', component: LazyMobileTesting },
  { path: '/mobile-dashboard', component: LazyMobileDashboard },
  { path: '/field-management', component: LazyFieldManagement },
  { path: '/workflow-management', component: LazyWorkflowManagement },
  { path: '/workflow-testing', component: LazyWorkflowTesting },
  { path: '/resources', component: LazyResources },
  { path: '/tools', component: LazyTools },
  { path: '/blog/:slug', component: LazyBlogPost },
  { path: '/projects/:projectId/tasks/new', component: LazyProjectTaskCreate }
];

/**
 * Preload high-priority routes for better perceived performance
 * This triggers the import() calls to start loading the chunks in the background
 */
export const preloadHighPriorityRoutes = () => {
  // Use requestIdleCallback to avoid blocking the main thread
  const preload = () => {
    // Preload core pages that users are most likely to navigate to
    const preloadImports = [
      () => import('@/pages/Index'),
      () => import('@/pages/Auth'),
      () => import('@/pages/Dashboard'),
      () => import('@/pages/hubs/ProjectsHub'),
      () => import('@/pages/Projects'),
    ];

    // Stagger preloads to avoid network congestion
    preloadImports.forEach((importFn, index) => {
      setTimeout(() => {
        importFn().catch(() => {
          // Silently ignore preload errors - they'll be handled when the route is actually visited
        });
      }, index * 100); // 100ms delay between each preload
    });
  };

  // Defer preloading until browser is idle
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preload, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(preload, 1000);
    }
  }
};

/**
 * Get route config by path
 */
export const getRouteConfig = (path: string): LazyRouteConfig | undefined => {
  return lazyRouteConfigs.find(config => config.path === path);
};
