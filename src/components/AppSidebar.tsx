import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
  Calculator,
  Brain,
} from "lucide-react";

interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  roles: string[];
  badge?: string;
}

interface NavigationCategory {
  label: string;
  items: NavigationItem[];
}

const navigationCategories: NavigationCategory[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "technician",
          "office_staff",
          "accounting",
          "estimator",
          "safety_officer",
          "quality_inspector",
          "root_admin",
        ],
      },
      {
        title: "My Tasks",
        url: "/my-tasks",
        icon: CheckSquare,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "technician",
          "office_staff",
          "accounting",
          "estimator",
          "safety_officer",
          "quality_inspector",
          "root_admin",
        ],
      },
    ],
  },
  {
    label: "Project Management",
    items: [
      {
        title: "All Projects",
        url: "/projects",
        icon: Building2,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "estimator",
          "office_staff",
          "accounting",
          "root_admin",
        ],
      },
      {
        title: "Create Project",
        url: "/create-project",
        icon: Building2,
        roles: ["admin", "superintendent", "project_manager", "root_admin"],
      },
      {
        title: "Estimates",
        url: "/estimates",
        icon: Calculator,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "estimator",
          "office_staff",
          "accounting",
          "root_admin",
        ],
      },
      {
        title: "Schedule Management",
        url: "/schedule-management",
        icon: Calendar,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "office_staff",
          "root_admin",
        ],
      },
      {
        title: "Job Costing",
        url: "/job-costing",
        icon: DollarSign,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "estimator",
          "accounting",
          "root_admin",
        ],
      },
      {
        title: "Change Orders",
        url: "/change-orders",
        icon: Wrench,
        roles: ["admin", "superintendent", "project_manager", "root_admin"],
      },
      {
        title: "Daily Reports",
        url: "/daily-reports",
        icon: Clipboard,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "root_admin",
        ],
      },
      {
        title: "RFIs",
        url: "/rfis",
        icon: HelpCircle,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "office_staff",
          "root_admin",
        ],
      },
      {
        title: "Submittals",
        url: "/submittals",
        icon: FileText,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "office_staff",
          "root_admin",
        ],
      },
      {
        title: "Punch List",
        url: "/punch-list",
        icon: CheckSquare,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "quality_inspector",
          "office_staff",
          "root_admin",
        ],
      },
    ],
  },
  {
    label: "Customer Relationship Management",
    items: [
      {
        title: "CRM Dashboard",
        url: "/crm",
        icon: Users,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
      },
      {
        title: "Leads",
        url: "/crm/leads",
        icon: Users,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
      },
      {
        title: "Contacts",
        url: "/crm/contacts",
        icon: Users,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
      },
      {
        title: "Opportunities",
        url: "/crm/opportunities",
        icon: TrendingUp,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
      },
    ],
  },
  {
    label: "Financial Management",
    items: [
      {
        title: "Financial Dashboard",
        url: "/financial",
        icon: DollarSign,
        roles: ["admin", "project_manager", "accounting", "root_admin"],
      },
      {
        title: "Reports & Analytics",
        url: "/reports",
        icon: BarChart3,
        roles: ["admin", "project_manager", "accounting", "root_admin"],
      },
      {
        title: "Purchase Orders",
        url: "/purchase-orders",
        icon: FileText,
        roles: [
          "admin",
          "project_manager",
          "office_staff",
          "accounting",
          "root_admin",
        ],
      },
      {
        title: "Vendors",
        url: "/vendors",
        icon: Users,
        roles: [
          "admin",
          "project_manager",
          "office_staff",
          "accounting",
          "root_admin",
        ],
      },
      {
        title: "QuickBooks Routing",
        url: "/quickbooks-routing",
        icon: TrendingUp,
        roles: ["admin", "project_manager", "accounting", "root_admin"],
      },
    ],
  },
  {
    label: "Resource Management",
    items: [
      {
        title: "Team Management",
        url: "/team",
        icon: Users,
        roles: ["admin", "superintendent", "project_manager", "root_admin"],
      },
      {
        title: "Crew Scheduling",
        url: "/crew-scheduling",
        icon: Calendar,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "root_admin",
        ],
      },
      {
        title: "Time Tracking",
        url: "/time-tracking",
        icon: Clock,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "technician",
          "journeyman",
          "equipment_operator",
          "office_staff",
          "root_admin",
        ],
      },
      {
        title: "Materials",
        url: "/materials",
        icon: Package,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "office_staff",
          "root_admin",
        ],
      },
      {
        title: "Material Orchestration",
        url: "/material-orchestration",
        icon: Package,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "office_staff",
          "root_admin",
        ],
        badge: "New",
      },
      {
        title: "Equipment Tracking",
        url: "/equipment",
        icon: Truck,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "equipment_operator",
          "office_staff",
          "root_admin",
        ],
      },
      {
        title: "Equipment Management",
        url: "/equipment-management",
        icon: Wrench,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "field_supervisor",
          "equipment_operator",
          "office_staff",
          "root_admin",
        ],
      },
      {
        title: "Document Management",
        url: "/documents",
        icon: FolderOpen,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "office_staff",
          "root_admin",
        ],
      },
    ],
  },
  {
    label: "Legal & Compliance",
    items: [
      {
        title: "Safety Management",
        url: "/safety",
        icon: Shield,
        roles: ["admin", "project_manager", "field_supervisor", "root_admin"],
      },
      {
        title: "AI Quality Control",
        url: "/ai-quality-control",
        icon: Brain,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "quality_inspector",
          "root_admin",
        ],
        badge: "New",
      },
      {
        title: "Permit Management",
        url: "/permit-management",
        icon: FileText,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
      },
      {
        title: "Environmental Permits",
        url: "/environmental-permitting",
        icon: FileText,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
      },
      {
        title: "Bond & Insurance",
        url: "/bond-insurance",
        icon: Shield,
        roles: ["admin", "project_manager", "accounting", "root_admin"],
      },
      {
        title: "Warranty Management",
        url: "/warranty-management",
        icon: Wrench,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
      },
      {
        title: "Compliance Audit",
        url: "/compliance-audit",
        icon: FileText,
        roles: ["admin", "root_admin"],
      },
      {
        title: "GDPR Compliance",
        url: "/gdpr-compliance",
        icon: Lock,
        roles: ["admin", "root_admin"],
      },
    ],
  },
  {
    label: "Specialized Services",
    items: [
      {
        title: "Public Procurement",
        url: "/public-procurement",
        icon: Globe,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
      },
      {
        title: "Service Dispatch",
        url: "/service-dispatch",
        icon: Truck,
        roles: [
          "admin",
          "project_manager",
          "field_supervisor",
          "office_staff",
          "root_admin",
        ],
      },
      {
        title: "Calendar Integration",
        url: "/calendar",
        icon: Calendar,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
      },
    ],
  },
  {
    label: "Communication & Support",
    items: [
      {
        title: "Smart Client Updates",
        url: "/smart-client-updates",
        icon: Zap,
        roles: ["admin", "project_manager", "office_staff", "root_admin"],
        badge: "New",
      },
      {
        title: "Email Marketing",
        url: "/email-marketing",
        icon: MessageSquare,
        roles: ["admin", "office_staff", "root_admin"],
      },
      {
        title: "Automated Workflows",
        url: "/workflows",
        icon: Settings,
        roles: ["admin", "project_manager", "root_admin"],
      },
      {
        title: "Trade Handoff Coordination",
        url: "/trade-handoff",
        icon: Users,
        roles: [
          "admin",
          "superintendent",
          "project_manager",
          "foreman",
          "root_admin",
        ],
        badge: "New",
      },
      {
        title: "Knowledge Base",
        url: "/knowledge-base",
        icon: FileText,
        roles: [
          "admin",
          "project_manager",
          "field_supervisor",
          "office_staff",
          "accounting",
          "root_admin",
        ],
      },
      {
        title: "Support",
        url: "/support",
        icon: MessageSquare,
        roles: [
          "admin",
          "project_manager",
          "field_supervisor",
          "office_staff",
          "accounting",
          "root_admin",
        ],
      },
    ],
  },
  {
    label: "System Administration",
    items: [
      {
        title: "Companies",
        url: "/admin/companies",
        icon: Building2,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "Users",
        url: "/admin/users",
        icon: Users,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "Billing",
        url: "/admin/billing",
        icon: DollarSign,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "Complimentary Subscriptions",
        url: "/admin/complimentary",
        icon: Gift,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "Analytics",
        url: "/admin/analytics",
        icon: TrendingUp,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "Blog Manager",
        url: "/blog-manager",
        icon: MessageSquare,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "System Settings",
        url: "/admin/settings",
        icon: Settings,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "Promotions",
        url: "/admin/promotions",
        icon: Tag,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "SEO Manager",
        url: "/admin/seo",
        icon: Globe,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "Security Monitoring",
        url: "/security-monitoring",
        icon: Shield,
        roles: ["root_admin"],
        badge: "Admin",
      },
      {
        title: "Rate Limiting",
        url: "/rate-limiting",
        icon: Settings,
        roles: ["root_admin"],
        badge: "Admin",
      },
    ],
  },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { userProfile } = useAuth();
  const { canAccessRoute } = usePermissions();
  const currentPath = location.pathname;

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-accent text-accent-foreground font-medium"
      : "hover:bg-accent/50";

  const filterItemsByRole = (items: NavigationItem[]) => {
    return items.filter((item) => {
      // Root admin items should only be visible to root_admin
      if (item.roles.length === 1 && item.roles[0] === "root_admin") {
        return userProfile?.role === "root_admin";
      }
      // For other items, check normal role access
      const hasRole =
        userProfile?.role === "root_admin" ||
        item.roles.includes(userProfile?.role || "");
      const hasAccess = canAccessRoute(item.url);
      return hasRole && hasAccess;
    });
  };

  const getVisibleCategories = () => {
    return navigationCategories
      .map((category) => ({
        ...category,
        items: filterItemsByRole(category.items),
      }))
      .filter((category) => category.items.length > 0);
  };

  const visibleCategories = getVisibleCategories();

  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="p-2">
        <div className="flex items-center justify-between">
          <SidebarTrigger />
          <div className="flex items-center space-x-2">
            <ThemeToggle />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleCategories.map((category) => (
          <SidebarGroup key={category.label}>
            <SidebarGroupLabel>
              {!collapsed && category.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {category.items.map((item) => {
                  const isActive = currentPath === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={getNavClass}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && (
                            <div className="flex items-center justify-between w-full">
                              <span>{item.title}</span>
                              {item.badge && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs px-1 py-0"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="space-y-2">
            <NavLink to="/upgrade">
              <Button
                variant="default"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            </NavLink>
          </div>
        )}
        {collapsed && (
          <NavLink to="/upgrade">
            <Button variant="default" size="icon" className="w-full">
              <Zap className="h-4 w-4" />
            </Button>
          </NavLink>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
