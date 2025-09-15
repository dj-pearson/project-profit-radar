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
 */
export const preloadHighPriorityRoutes = () => {
  lazyRouteConfigs
    .filter(config => config.preload)
    .forEach(config => {
      // Preload the component
      config.component.preload?.();
    });
};

/**
 * Get route config by path
 */
export const getRouteConfig = (path: string): LazyRouteConfig | undefined => {
  return lazyRouteConfigs.find(config => config.path === path);
};
