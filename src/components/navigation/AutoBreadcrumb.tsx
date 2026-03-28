import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

/**
 * Route label mappings for human-readable breadcrumb text.
 * Covers all major routes from HierarchicalNavigationConfig.
 */
const ROUTE_LABELS: Record<string, string> = {
  // Overview
  'dashboard': 'Dashboard',
  'my-tasks': 'My Tasks',
  // Projects
  'projects': 'Projects',
  'projects-hub': 'Projects',
  'create-project': 'Create Project',
  'job-costing': 'Job Costing',
  'daily-reports': 'Daily Reports',
  'rfis': 'RFIs',
  'submittals': 'Submittals',
  'change-orders': 'Change Orders',
  'punch-list': 'Punch List',
  'documents': 'Documents',
  'materials': 'Materials',
  'material-tracking': 'Material Tracking',
  'equipment': 'Equipment',
  // People
  'team': 'Team',
  'crew-scheduling': 'Crew Scheduling',
  'time-tracking': 'Time Tracking',
  'crm': 'CRM',
  'leads': 'Leads',
  'contacts': 'Contacts',
  'opportunities': 'Opportunities',
  'pipeline': 'Pipeline',
  'lead-intelligence': 'Lead Intelligence',
  'workflows': 'Workflows',
  'campaigns': 'Campaigns',
  'analytics': 'Analytics',
  'email-marketing': 'Email Marketing',
  'support': 'Support',
  'people-hub': 'People',
  // Financial
  'financial': 'Financial',
  'finance-hub': 'Financial',
  'financial-hub': 'Financial',
  'estimates': 'Estimates',
  'reports': 'Reports',
  'finance': 'Finance',
  'chart-of-accounts': 'Chart of Accounts',
  'general-ledger': 'General Ledger',
  'journal-entries': 'Journal Entries',
  'fiscal-periods': 'Fiscal Periods',
  'accounts-payable': 'Accounts Payable',
  'bill-payments': 'Bill Payments',
  'invoices': 'Invoices',
  'balance-sheet': 'Balance Sheet',
  'profit-loss': 'Profit & Loss',
  'cash-flow': 'Cash Flow',
  'trial-balance': 'Trial Balance',
  'purchase-orders': 'Purchase Orders',
  'vendors': 'Vendors',
  'quickbooks-routing': 'QuickBooks',
  // Operations
  'safety': 'Safety',
  'compliance-audit': 'Compliance Audit',
  'gdpr-compliance': 'GDPR Compliance',
  'permit-management': 'Permits',
  'environmental-permitting': 'Environmental Permits',
  'bond-insurance': 'Bond & Insurance',
  'warranty-management': 'Warranties',
  'public-procurement': 'Public Procurement',
  'service-dispatch': 'Service Dispatch',
  'calendar': 'Calendar',
  'equipment-management': 'Equipment Management',
  'knowledge-base': 'Knowledge Base',
  'operations-hub': 'Operations',
  // Admin
  'admin': 'Admin',
  'admin-hub': 'Admin',
  'companies': 'Companies',
  'users': 'Users',
  'settings': 'Settings',
  'system-admin': 'System Admin',
  'ai-models': 'AI Models',
  'billing': 'Billing',
  'complimentary': 'Complimentary',
  'promotions': 'Promotions',
  'demos': 'Demos',
  'conversion-analytics': 'Conversion Analytics',
  'retention-analytics': 'Retention Analytics',
  'revenue-analytics': 'Revenue Analytics',
  'churn-prediction': 'Churn Prediction',
  'ai-estimating': 'AI Estimating',
  'risk-prediction': 'Risk Prediction',
  'auto-scheduling': 'Auto Scheduling',
  'safety-automation': 'Safety Automation',
  'smart-procurement': 'Smart Procurement',
  'advanced-dashboards': 'Advanced Dashboards',
  'client-portal-pro': 'Client Portal Pro',
  'billing-automation': 'Billing Automation',
  'reporting-engine': 'Reporting Engine',
  'tenants': 'Tenants',
  'sso': 'SSO',
  'permissions': 'Permissions',
  'audit': 'Audit Logs',
  'error-logs': 'Error Logs',
  'api-keys': 'API Keys',
  'webhooks': 'Webhooks',
  'developer-portal': 'Developer Portal',
  'gps-tracking': 'GPS Tracking',
  'blog-manager': 'Blog Manager',
  'knowledge-base-admin': 'Knowledge Base Admin',
  'social-media': 'Social Media',
  'seo-management': 'SEO Management',
  'funnels': 'Funnels',
  'support-tickets': 'Support Tickets',
  'customer-service': 'Customer Service',
  'security-settings': 'Security Settings',
  'security-monitoring': 'Security Monitoring',
  'user-settings': 'Settings',
  // Other
  'client-portal': 'Client Portal',
};

/** Convert a URL segment to a human-readable label */
function segmentToLabel(segment: string): string {
  if (ROUTE_LABELS[segment]) {
    return ROUTE_LABELS[segment];
  }
  // Convert kebab-case to Title Case
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Check if a segment looks like a UUID or dynamic ID */
function isDynamicSegment(segment: string): boolean {
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  // Numeric ID
  if (/^\d+$/.test(segment)) {
    return true;
  }
  return false;
}

interface BreadcrumbEntry {
  label: string;
  path: string;
  isCurrentPage: boolean;
}

export const AutoBreadcrumb: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Don't show breadcrumbs on root/dashboard
  if (pathname === '/' || pathname === '/dashboard') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs for single-segment top-level routes
  if (segments.length <= 1) {
    return null;
  }

  const crumbs: BreadcrumbEntry[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    const isLast = i === segments.length - 1;

    if (isDynamicSegment(segment)) {
      crumbs.push({
        label: 'Details',
        path: currentPath,
        isCurrentPage: isLast,
      });
    } else {
      crumbs.push({
        label: segmentToLabel(segment),
        path: currentPath,
        isCurrentPage: isLast,
      });
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" aria-label="Home">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((crumb) => (
          <React.Fragment key={crumb.path}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.isCurrentPage ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
