import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
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
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
  Tag
} from 'lucide-react';

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
      { title: "Dashboard", url: "/dashboard", icon: Home, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] }
    ]
  },
  {
    label: "Project Management",
    items: [
      { title: "All Projects", url: "/projects", icon: Building2, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"] },
      { title: "Create Project", url: "/create-project", icon: Building2, roles: ["admin", "project_manager", "root_admin"] },
      { title: "Crew Scheduling", url: "/crew-scheduling", icon: Calendar, roles: ["admin", "project_manager", "field_supervisor", "root_admin"] },
      { title: "Time Tracking", url: "/time-tracking", icon: Clock, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
      { title: "Daily Reports", url: "/daily-reports", icon: Clipboard, roles: ["admin", "project_manager", "field_supervisor", "root_admin"] },
      { title: "Change Orders", url: "/change-orders", icon: Wrench, roles: ["admin", "project_manager", "root_admin"] }
    ]
  },
  {
    label: "Financial",
    items: [
      { title: "Financial Dashboard", url: "/financial", icon: DollarSign, roles: ["admin", "project_manager", "accounting", "root_admin"] },
      { title: "Reports & Analytics", url: "/reports", icon: BarChart3, roles: ["admin", "project_manager", "accounting", "root_admin"] }
    ]
  },
  {
    label: "Resources",
    items: [
      { title: "Team Management", url: "/team", icon: Users, roles: ["admin", "project_manager", "root_admin"] },
      { title: "Document Management", url: "/documents", icon: FolderOpen, roles: ["admin", "project_manager", "office_staff", "root_admin"] },
      { title: "Materials", url: "/materials", icon: Package, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] },
      { title: "Equipment", url: "/equipment", icon: Truck, roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"] }
    ]
  },
  {
    label: "Safety & Compliance",
    items: [
      { title: "Safety", url: "/safety", icon: Shield, roles: ["admin", "project_manager", "field_supervisor", "root_admin"] },
      { title: "Compliance Audit", url: "/compliance-audit", icon: FileText, roles: ["admin", "root_admin"] },
      { title: "GDPR Compliance", url: "/gdpr-compliance", icon: Lock, roles: ["admin", "root_admin"] }
    ]
  },
  {
    label: "System Administration",
    items: [
      { title: "Companies", url: "/admin/companies", icon: Building2, roles: ["root_admin"], badge: "Admin" },
      { title: "Users", url: "/admin/users", icon: Users, roles: ["root_admin"], badge: "Admin" },
      { title: "Billing", url: "/admin/billing", icon: DollarSign, roles: ["root_admin"], badge: "Admin" },
      { title: "Analytics", url: "/admin/analytics", icon: TrendingUp, roles: ["root_admin"], badge: "Admin" },
      { title: "Blog Manager", url: "/blog-manager", icon: MessageSquare, roles: ["root_admin"], badge: "Admin" },
      { title: "System Settings", url: "/admin/settings", icon: Settings, roles: ["root_admin"], badge: "Admin" },
      { title: "Promotions", url: "/admin/promotions", icon: Tag, roles: ["root_admin"], badge: "Admin" },
      { title: "SEO Manager", url: "/admin/seo", icon: Globe, roles: ["root_admin"], badge: "Admin" },
      { title: "Security Monitoring", url: "/security-monitoring", icon: Shield, roles: ["root_admin"], badge: "Admin" },
      { title: "Rate Limiting", url: "/rate-limiting", icon: Settings, roles: ["root_admin"], badge: "Admin" }
    ]
  }
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { userProfile } = useAuth();
  const { canAccessRoute } = usePermissions();
  const currentPath = location.pathname;

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  const filterItemsByRole = (items: NavigationItem[]) => {
    return items.filter(item => {
      const hasRole = userProfile?.role === 'root_admin' || item.roles.includes(userProfile?.role || '');
      const hasAccess = canAccessRoute(item.url);
      return hasRole && hasAccess;
    });
  };

  const getVisibleCategories = () => {
    return navigationCategories
      .map(category => ({
        ...category,
        items: filterItemsByRole(category.items)
      }))
      .filter(category => category.items.length > 0);
  };

  const visibleCategories = getVisibleCategories();

  const collapsed = state === 'collapsed';

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
            <SidebarGroupLabel>{!collapsed && category.label}</SidebarGroupLabel>
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
                                <Badge variant="destructive" className="text-xs px-1 py-0">
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
              <Button variant="default" className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
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