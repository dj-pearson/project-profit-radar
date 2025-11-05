import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import {
  Home,
  Building2,
  DollarSign,
  Users,
  Settings,
  Wrench,
  Shield,
  Calendar,
  FileText,
  BarChart3,
  type LucideIcon
} from 'lucide-react';

export interface MobileNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  roles?: string[];
  badge?: string | number;
}

interface NavigationConfig {
  default: MobileNavItem[];
  admin: MobileNavItem[];
  projectManager: MobileNavItem[];
  fieldSupervisor: MobileNavItem[];
  accounting: MobileNavItem[];
}

/**
 * Hook for managing role-based and context-aware mobile navigation
 */
export function useMobileNavigation() {
  const { userProfile } = useAuth();
  const location = useLocation();
  const userRole = userProfile?.role || 'admin';

  // Navigation configurations for different user roles
  const navigationConfig: NavigationConfig = useMemo(() => ({
    default: [
      { icon: Home, label: 'Home', href: '/dashboard' },
      { icon: Building2, label: 'Projects', href: '/projects-hub' },
      { icon: DollarSign, label: 'Financial', href: '/financial-hub' },
      { icon: Users, label: 'People', href: '/people-hub' },
      { icon: Settings, label: 'More', href: '/admin-hub' },
    ],
    admin: [
      { icon: Home, label: 'Home', href: '/dashboard' },
      { icon: Building2, label: 'Projects', href: '/projects-hub' },
      { icon: DollarSign, label: 'Financial', href: '/financial-hub' },
      { icon: Users, label: 'People', href: '/people-hub' },
      { icon: Settings, label: 'Admin', href: '/admin-hub' },
    ],
    projectManager: [
      { icon: Home, label: 'Home', href: '/dashboard' },
      { icon: Building2, label: 'Projects', href: '/projects-hub' },
      { icon: Calendar, label: 'Schedule', href: '/schedule-management' },
      { icon: FileText, label: 'Reports', href: '/daily-reports' },
      { icon: Users, label: 'Team', href: '/team' },
    ],
    fieldSupervisor: [
      { icon: Home, label: 'Home', href: '/dashboard' },
      { icon: Building2, label: 'Projects', href: '/projects-hub' },
      { icon: Calendar, label: 'Schedule', href: '/crew-scheduling' },
      { icon: Shield, label: 'Safety', href: '/safety' },
      { icon: Wrench, label: 'Field', href: '/field-management' },
    ],
    accounting: [
      { icon: Home, label: 'Home', href: '/dashboard' },
      { icon: DollarSign, label: 'Financial', href: '/financial-hub' },
      { icon: BarChart3, label: 'Reports', href: '/reports' },
      { icon: FileText, label: 'Invoices', href: '/financial-hub' },
      { icon: Settings, label: 'Settings', href: '/company-settings' },
    ],
  }), []);

  // Get navigation items based on user role
  const getNavigationItems = (): MobileNavItem[] => {
    // Map user roles to navigation configs
    const roleMap: Record<string, keyof NavigationConfig> = {
      'root_admin': 'admin',
      'admin': 'admin',
      'project_manager': 'projectManager',
      'field_supervisor': 'fieldSupervisor',
      'accounting': 'accounting',
    };

    const configKey = roleMap[userRole] || 'default';
    return navigationConfig[configKey];
  };

  // Get context-aware navigation (changes based on current page)
  const getContextualNavigation = (): MobileNavItem[] | null => {
    const path = location.pathname;

    // Project detail page - show project-specific navigation
    if (path.startsWith('/projects/') && path !== '/projects-hub') {
      return [
        { icon: Building2, label: 'Overview', href: path },
        { icon: FileText, label: 'Documents', href: '/documents' },
        { icon: DollarSign, label: 'Costs', href: '/job-costing' },
        { icon: Calendar, label: 'Schedule', href: '/schedule-management' },
        { icon: Wrench, label: 'Changes', href: '/change-orders' },
      ];
    }

    // Financial section - show financial navigation
    if (path.startsWith('/financial')) {
      return [
        { icon: BarChart3, label: 'Dashboard', href: '/financial' },
        { icon: FileText, label: 'Reports', href: '/reports' },
        { icon: DollarSign, label: 'Estimates', href: '/estimates' },
        { icon: Building2, label: 'Projects', href: '/projects-hub' },
        { icon: Home, label: 'Home', href: '/dashboard' },
      ];
    }

    return null; // Use default navigation
  };

  const items = getContextualNavigation() || getNavigationItems();

  return {
    items,
    activeHref: location.pathname,
    userRole,
    isCustomContext: getContextualNavigation() !== null,
  };
}

/**
 * Hook for custom navigation items (for specific pages)
 */
export function useCustomNavigation(items: MobileNavItem[]) {
  const location = useLocation();

  return {
    items,
    activeHref: location.pathname,
  };
}
