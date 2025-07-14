import {
  Home,
  Building2,
  DollarSign,
  Users,
  Clipboard,
  Settings,
  FileText,
  HelpCircle,
  CheckSquare,
  Wrench,
  BarChart3,
  Clock,
  Package,
  Truck,
  Calendar,
  Shield,
  Globe,
  MessageSquare,
  TrendingUp,
  FolderOpen,
  Lock,
  Tag,
  Gift
} from 'lucide-react';

export interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  roles: string[];
  badge?: string;
  description?: string;
}

export interface NavigationCategory {
  label: string;
  items: NavigationItem[];
}

export interface DashboardArea {
  id: string;
  title: string;
  icon: any;
  url: string;
  roles: string[];
  description: string;
  subcategories: NavigationCategory[];
}

// Main navigation areas (simplified sidebar)
export const mainNavigation: NavigationItem[] = [
  { 
    title: "Dashboard", 
    url: "/dashboard", 
    icon: Home, 
    roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"],
    description: "Overview and key metrics"
  },
  { 
    title: "Projects", 
    url: "/projects-hub", 
    icon: Building2, 
    roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"],
    description: "Project management hub"
  },
  { 
    title: "Financial", 
    url: "/financial-hub", 
    icon: DollarSign, 
    roles: ["admin", "project_manager", "accounting", "root_admin"],
    description: "Financial management hub"
  },
  { 
    title: "People", 
    url: "/people-hub", 
    icon: Users, 
    roles: ["admin", "project_manager", "office_staff", "root_admin"],
    description: "Team and customer management"
  },
  { 
    title: "Operations", 
    url: "/operations-hub", 
    icon: Clipboard, 
    roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"],
    description: "Daily operations and compliance"
  }
];

// Role-specific additional navigation (only for root_admin and admin)
export const adminNavigation: NavigationItem[] = [
  { 
    title: "Admin", 
    url: "/admin-hub", 
    icon: Settings, 
    roles: ["admin", "root_admin"],
    description: "System administration"
  }
];

// Dashboard areas with their subcategories
export const dashboardAreas: DashboardArea[] = [
  {
    id: 'projects',
    title: 'Projects',
    icon: Building2,
    url: '/projects-hub',
    roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"],
    description: 'Manage all aspects of your construction projects',
    subcategories: [
      {
        label: "Project Management",
        items: [
          { title: "All Projects", url: "/projects", icon: Building2, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] },
          { title: "Create Project", url: "/create-project", icon: Building2, roles: ["admin", "project_manager", "root_admin"] },
          { title: "Job Costing", url: "/job-costing", icon: DollarSign, roles: ["admin", "project_manager", "accounting", "root_admin"] },
          { title: "Daily Reports", url: "/daily-reports", icon: Clipboard, roles: ["admin", "project_manager", "field_supervisor", "root_admin"] }
        ]
      },
      {
        label: "Project Communication",
        items: [
          { title: "RFIs", url: "/rfis", icon: HelpCircle, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
          { title: "Submittals", url: "/submittals", icon: FileText, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
          { title: "Change Orders", url: "/change-orders", icon: Wrench, roles: ["admin", "project_manager", "root_admin"] },
          { title: "Punch List", url: "/punch-list", icon: CheckSquare, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] }
        ]
      },
      {
        label: "Project Resources",
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
    id: 'financial',
    title: 'Financial',
    icon: DollarSign,
    url: '/financial-hub',
    roles: ["admin", "project_manager", "accounting", "root_admin"],
    description: 'Financial management and reporting',
    subcategories: [
      {
        label: "Financial Overview",
        items: [
          { title: "Financial Dashboard", url: "/financial", icon: DollarSign, roles: ["admin", "project_manager", "accounting", "root_admin"] },
          { title: "Reports & Analytics", url: "/reports", icon: BarChart3, roles: ["admin", "project_manager", "accounting", "root_admin"] }
        ]
      },
      {
        label: "Purchasing",
        items: [
          { title: "Purchase Orders", url: "/purchase-orders", icon: FileText, roles: ["admin", "project_manager", "office_staff", "accounting", "root_admin"] },
          { title: "Vendors", url: "/vendors", icon: Users, roles: ["admin", "project_manager", "office_staff", "accounting", "root_admin"] }
        ]
      },
      {
        label: "Integrations",
        items: [
          { title: "QuickBooks Routing", url: "/quickbooks-routing", icon: TrendingUp, roles: ["admin", "project_manager", "accounting", "root_admin"] }
        ]
      }
    ]
  },
  {
    id: 'people',
    title: 'People',
    icon: Users,
    url: '/people-hub',
    roles: ["admin", "project_manager", "office_staff", "root_admin"],
    description: 'Team and customer relationship management',
    subcategories: [
      {
        label: "Team Management",
        items: [
          { title: "Team Management", url: "/team", icon: Users, roles: ["admin", "project_manager", "root_admin"] },
          { title: "Crew Scheduling", url: "/crew-scheduling", icon: Calendar, roles: ["admin", "project_manager", "field_supervisor", "root_admin"] },
          { title: "Time Tracking", url: "/time-tracking", icon: Clock, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] }
        ]
      },
      {
        label: "Customer Relationship Management",
        items: [
          { title: "CRM Dashboard", url: "/crm", icon: Users, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Leads", url: "/crm/leads", icon: Users, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Contacts", url: "/crm/contacts", icon: Users, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Opportunities", url: "/crm/opportunities", icon: TrendingUp, roles: ["admin", "project_manager", "office_staff", "root_admin"] }
        ]
      },
      {
        label: "Communication",
        items: [
          { title: "Email Marketing", url: "/email-marketing", icon: MessageSquare, roles: ["admin", "office_staff", "root_admin"] },
          { title: "Support", url: "/support", icon: MessageSquare, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] }
        ]
      }
    ]
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: Clipboard,
    url: '/operations-hub',
    roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"],
    description: 'Daily operations, safety, and compliance',
    subcategories: [
      {
        label: "Safety & Compliance",
        items: [
          { title: "Safety Management", url: "/safety", icon: Shield, roles: ["admin", "project_manager", "field_supervisor", "root_admin"] },
          { title: "Compliance Audit", url: "/compliance-audit", icon: FileText, roles: ["admin", "root_admin"] },
          { title: "GDPR Compliance", url: "/gdpr-compliance", icon: Lock, roles: ["admin", "root_admin"] }
        ]
      },
      {
        label: "Legal & Permits",
        items: [
          { title: "Permit Management", url: "/permit-management", icon: FileText, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Environmental Permits", url: "/environmental-permitting", icon: FileText, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Bond & Insurance", url: "/bond-insurance", icon: Shield, roles: ["admin", "project_manager", "accounting", "root_admin"] },
          { title: "Warranty Management", url: "/warranty-management", icon: Wrench, roles: ["admin", "project_manager", "office_staff", "root_admin"] }
        ]
      },
      {
        label: "Specialized Services",
        items: [
          { title: "Public Procurement", url: "/public-procurement", icon: Globe, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
          { title: "Service Dispatch", url: "/service-dispatch", icon: Truck, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
          { title: "Calendar Integration", url: "/calendar", icon: Calendar, roles: ["admin", "project_manager", "office_staff", "root_admin"] }
        ]
      },
      {
        label: "Equipment & Assets",
        items: [
          { title: "Equipment Management", url: "/equipment-management", icon: Wrench, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] }
        ]
      },
      {
        label: "Process Automation",
        items: [
          { title: "Automated Workflows", url: "/workflows", icon: Settings, roles: ["admin", "project_manager", "root_admin"] },
          { title: "Knowledge Base", url: "/knowledge-base", icon: FileText, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] }
        ]
      }
    ]
  },
  {
    id: 'admin',
    title: 'Administration',
    icon: Settings,
    url: '/admin-hub',
    roles: ["admin", "root_admin"],
    description: 'System administration and platform management',
    subcategories: [
      {
        label: "Company Management",
        items: [
          { title: "Company Settings", url: "/company-settings", icon: Settings, roles: ["admin", "root_admin"] },
          { title: "Companies", url: "/admin/companies", icon: Building2, roles: ["root_admin"], badge: "Root Admin" },
          { title: "Users", url: "/admin/users", icon: Users, roles: ["root_admin"], badge: "Root Admin" }
        ]
      },
      {
        label: "Billing & Subscriptions",
        items: [
          { title: "Billing", url: "/admin/billing", icon: DollarSign, roles: ["root_admin"], badge: "Root Admin" },
          { title: "Complimentary Subscriptions", url: "/admin/complimentary", icon: Gift, roles: ["root_admin"], badge: "Root Admin" },
          { title: "Promotions", url: "/admin/promotions", icon: Tag, roles: ["root_admin"], badge: "Root Admin" }
        ]
      },
      {
        label: "Platform Management",
        items: [
          { title: "Analytics", url: "/admin/analytics", icon: TrendingUp, roles: ["root_admin"], badge: "Root Admin" },
          { title: "System Settings", url: "/admin/settings", icon: Settings, roles: ["root_admin"], badge: "Root Admin" },
          { title: "Security Monitoring", url: "/security-monitoring", icon: Shield, roles: ["root_admin"], badge: "Root Admin" },
          { title: "Rate Limiting", url: "/rate-limiting", icon: Settings, roles: ["root_admin"], badge: "Root Admin" }
        ]
      },
      {
        label: "Content Management",
        items: [
          { title: "Blog Manager", url: "/blog-manager", icon: MessageSquare, roles: ["root_admin"], badge: "Root Admin" },
          { title: "Knowledge Base Admin", url: "/knowledge-base-admin", icon: FileText, roles: ["root_admin"], badge: "Root Admin" },
          { title: "SEO Manager", url: "/admin/seo", icon: Globe, roles: ["root_admin"], badge: "Root Admin" }
        ]
      },
      {
        label: "Support Management",
        items: [
          { title: "Support Tickets", url: "/admin/support-tickets", icon: HelpCircle, roles: ["admin", "root_admin"] },
          { title: "Customer Service", url: "/admin/customer-service", icon: MessageSquare, roles: ["admin", "root_admin"] }
        ]
      }
    ]
  }
];

// Helper function to get navigation based on user role
export const getNavigationForRole = (userRole: string): NavigationItem[] => {
  const navigation = [...mainNavigation.filter(item => item.roles.includes(userRole))];
  
  // Add admin navigation for admin roles
  if (['admin', 'root_admin'].includes(userRole)) {
    navigation.push(...adminNavigation.filter(item => item.roles.includes(userRole)));
  }
  
  return navigation;
};

// Helper function to get dashboard areas for role
export const getDashboardAreasForRole = (userRole: string): DashboardArea[] => {
  return dashboardAreas.filter(area => area.roles.includes(userRole));
};