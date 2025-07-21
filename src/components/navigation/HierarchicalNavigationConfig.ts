
import {
  Home,
  Building2,
  FileText,
  Users,
  DollarSign,
  BarChart3,
  Clock,
  Clipboard,
  FolderOpen,
  Wrench,
  Package,
  Truck,
  Calendar,
  Shield,
  Settings,
  Globe,
  MessageSquare,
  TrendingUp,
  Lock,
  Zap,
  Tag,
  Gift,
  HelpCircle,
  CheckSquare,
  CalendarDays,
  Calculator,
  BarChart4,
  ListTodo
} from 'lucide-react';

export interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  roles: string[];
  badge?: string;
  description?: string;
  hasAccess?: boolean;
}

export interface NavigationSection {
  id: string;
  label: string;
  items: NavigationItem[];
}

export interface NavigationArea {
  id: string;
  title: string;
  icon: any;
  sections: NavigationSection[];
}

export const hierarchicalNavigation: NavigationArea[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: Home,
    sections: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        items: [
          { title: "Dashboard", url: "/dashboard", icon: Home, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] },
          { title: "My Tasks", url: "/my-tasks", icon: ListTodo, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] }
        ]
      }
    ]
  },
  {
    id: 'projects',
    title: 'Projects',
    icon: Building2,
    sections: [
      {
        id: 'project_management',
        label: 'Project Management',
        items: [
          { title: "All Projects", url: "/projects", icon: Building2, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] },
          { title: "Create Project", url: "/create-project", icon: Building2, roles: ["admin", "project_manager", "root_admin"] },
          { title: "Job Costing", url: "/job-costing", icon: DollarSign, roles: ["admin", "project_manager", "accounting", "root_admin"] },
          { title: "Daily Reports", url: "/daily-reports", icon: Clipboard, roles: ["admin", "project_manager", "field_supervisor", "root_admin"] }
        ]
      },
      {
        id: 'project_communication',
        label: 'Project Communication',
        items: [
          { title: "RFIs", url: "/rfis", icon: HelpCircle, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
          { title: "Submittals", url: "/submittals", icon: FileText, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
          { title: "Change Orders", url: "/change-orders", icon: Wrench, roles: ["admin", "project_manager", "root_admin"] },
          { title: "Punch List", url: "/punch-list", icon: CheckSquare, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] }
        ]
      },
      {
        id: 'project_resources',
        label: 'Project Resources',
        items: [
          { title: "Document Management", url: "/documents", icon: FolderOpen, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Materials", url: "/materials", icon: Package, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
          { title: "Material Tracking", url: "/material-tracking", icon: Package, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
          { title: "Equipment", url: "/equipment", icon: Truck, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] }
        ]
      }
    ]
  },
  {
    id: 'people',
    title: 'People',
    icon: Users,
    sections: [
      {
        id: 'team_management',
        label: 'Team Management',
        items: [
          { title: "Team Management", url: "/team", icon: Users, roles: ["admin", "project_manager", "root_admin"] },
          { title: "Crew Scheduling", url: "/crew-scheduling", icon: CalendarDays, roles: ["admin", "project_manager", "field_supervisor", "root_admin"] },
          { title: "Time Tracking", url: "/time-tracking", icon: Clock, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] }
        ]
      },
      {
        id: 'customer_management',
        label: 'Customer Management',
        items: [
          { title: "CRM Dashboard", url: "/crm", icon: Users, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Leads", url: "/crm/leads", icon: Users, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Contacts", url: "/crm/contacts", icon: Users, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Opportunities", url: "/crm/opportunities", icon: TrendingUp, roles: ["admin", "project_manager", "office_staff", "root_admin"] }
        ]
      },
      {
        id: 'communication',
        label: 'Communication',
        items: [
          { title: "Email Marketing", url: "/email-marketing", icon: MessageSquare, roles: ["admin", "office_staff", "root_admin"] },
          { title: "Support", url: "/support", icon: MessageSquare, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] }
        ]
      }
    ]
  },
  {
    id: 'financial',
    title: 'Financial',
    icon: DollarSign,
    sections: [
      {
        id: 'financial_overview',
        label: 'Financial Overview',
        items: [
          { title: "Financial Dashboard", url: "/financial", icon: DollarSign, roles: ["admin", "project_manager", "accounting", "root_admin"] },
          { title: "Estimates", url: "/estimates", icon: Calculator, roles: ["admin", "project_manager", "office_staff", "accounting", "root_admin"] },
          { title: "Reports & Analytics", url: "/reports", icon: BarChart3, roles: ["admin", "project_manager", "accounting", "root_admin"] }
        ]
      },
      {
        id: 'purchasing',
        label: 'Purchasing',
        items: [
          { title: "Purchase Orders", url: "/purchase-orders", icon: FileText, roles: ["admin", "project_manager", "office_staff", "accounting", "root_admin"] },
          { title: "Vendors", url: "/vendors", icon: Users, roles: ["admin", "project_manager", "office_staff", "accounting", "root_admin"] }
        ]
      },
      {
        id: 'integrations',
        label: 'Integrations',
        items: [
          { title: "QuickBooks Routing", url: "/quickbooks-routing", icon: TrendingUp, roles: ["admin", "project_manager", "accounting", "root_admin"] }
        ]
      }
    ]
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: Settings,
    sections: [
      {
        id: 'safety_compliance',
        label: 'Safety & Compliance',
        items: [
          { title: "Safety Management", url: "/safety", icon: Shield, roles: ["admin", "project_manager", "field_supervisor", "root_admin"] },
          { title: "Compliance Audit", url: "/compliance-audit", icon: FileText, roles: ["admin", "root_admin"] },
          { title: "GDPR Compliance", url: "/gdpr-compliance", icon: Lock, roles: ["admin", "root_admin"] }
        ]
      },
      {
        id: 'permits_legal',
        label: 'Permits & Legal',
        items: [
          { title: "Permit Management", url: "/permit-management", icon: FileText, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Environmental Permits", url: "/environmental-permitting", icon: FileText, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Bond & Insurance", url: "/bond-insurance", icon: Shield, roles: ["admin", "project_manager", "accounting", "root_admin"] },
          { title: "Warranty Management", url: "/warranty-management", icon: Wrench, roles: ["admin", "project_manager", "office_staff", "root_admin"] }
        ]
      },
      {
        id: 'specialized_services',
        label: 'Specialized Services',
        items: [
          { title: "Public Procurement", url: "/public-procurement", icon: Globe, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Service Dispatch", url: "/service-dispatch", icon: Truck, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
          { title: "Calendar Integration", url: "/calendar", icon: Calendar, roles: ["admin", "project_manager", "office_staff", "root_admin"] }
        ]
      },
      {
        id: 'equipment_workflows',
        label: 'Equipment & Workflows',
        items: [
          { title: "Equipment Management", url: "/equipment-management", icon: Wrench, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
          { title: "Automated Workflows", url: "/workflows", icon: Settings, roles: ["admin", "project_manager", "root_admin"] },
          { title: "Knowledge Base", url: "/knowledge-base", icon: FileText, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] }
        ]
      }
    ]
  },
  {
    id: 'admin',
    title: 'Admin',
    icon: Shield,
    sections: [
        {
          id: 'system_admin',
          label: 'System Administration',
          items: [
            { title: "Companies", url: "/admin/companies", icon: Building2, roles: ["root_admin"], badge: "Admin" },
            { title: "Users", url: "/admin/users", icon: Users, roles: ["root_admin"], badge: "Admin" },
            { title: "System Settings", url: "/admin/settings", icon: Settings, roles: ["root_admin"], badge: "Admin" }
          ]
        },
      {
        id: 'business_admin',
        label: 'Business Administration',
        items: [
          { title: "Billing", url: "/admin/billing", icon: DollarSign, roles: ["root_admin"], badge: "Admin" },
          { title: "Complimentary Subscriptions", url: "/admin/complimentary", icon: Gift, roles: ["root_admin"], badge: "Admin" },
          { title: "Promotions", url: "/admin/promotions", icon: Tag, roles: ["root_admin"], badge: "Admin" }
        ]
      },
        {
          id: 'content_admin',
          label: 'Content Administration',
          items: [
            { title: "Blog Manager", url: "/blog-manager", icon: MessageSquare, roles: ["root_admin"], badge: "Admin" },
            { title: "Knowledge Base Admin", url: "/knowledge-base-admin", icon: FileText, roles: ["root_admin"], badge: "Admin" },
            { title: "Social Media Manager", url: "/admin/social-media", icon: MessageSquare, roles: ["root_admin"], badge: "Admin" },
            { title: "SEO Analytics", url: "/admin/seo-analytics", icon: BarChart4, roles: ["root_admin"], badge: "Admin" },
            { title: "SEO Manager", url: "/admin/seo", icon: Globe, roles: ["root_admin"], badge: "Admin" },
            { title: "Analytics", url: "/admin/analytics", icon: TrendingUp, roles: ["root_admin"], badge: "Admin" }
          ]
        },
        {
          id: 'support_admin',
          label: 'Support Administration',
          items: [
            { title: "Support Tickets", url: "/admin/support-tickets", icon: HelpCircle, roles: ["admin", "root_admin"], badge: "Admin" },
            { title: "Customer Service", url: "/admin/customer-service", icon: MessageSquare, roles: ["admin", "root_admin"], badge: "Admin" }
          ]
        },
        {
          id: 'security_admin',
          label: 'Security Administration',
          items: [
            { title: "Security Settings", url: "/security-settings", icon: Shield, roles: ["admin", "root_admin"] },
            { title: "Security Monitoring", url: "/security-monitoring", icon: Shield, roles: ["root_admin"], badge: "Admin" },
            { title: "Rate Limiting", url: "/rate-limiting", icon: Settings, roles: ["root_admin"], badge: "Admin" }
          ]
        }
    ]
  }
];

// Helper function to find which section a URL belongs to
export const findSectionByUrl = (url: string): { area: NavigationArea; section: NavigationSection } | null => {
  for (const area of hierarchicalNavigation) {
    for (const section of area.sections) {
      const foundItem = section.items.find(item => item.url === url);
      if (foundItem) {
        return { area, section };
      }
    }
  }
  return null;
};

// Helper function to get navigation items for a user role within a specific section
export const getNavigationForSection = (sectionId: string, userRole: string): NavigationItem[] => {
  for (const area of hierarchicalNavigation) {
    const section = area.sections.find(s => s.id === sectionId);
    if (section) {
      return section.items.filter(item => 
        userRole === 'root_admin' || item.roles.includes(userRole)
      );
    }
  }
  return [];
};
