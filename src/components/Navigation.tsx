import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Building2,
  FileText,
  Users,
  DollarSign,
  BarChart3,
  Clock,
  Clipboard,
  Settings,
  FolderOpen,
  Calendar,
  TrendingUp,
  Wrench,
  MessageSquare,
  Shield,
  Globe,
  Lock,
  CalendarDays
} from 'lucide-react';

interface NavigationProps {
  userRole: string;
}

interface NavigationItem {
  title: string;
  description: string;
  icon: any;
  path: string;
  roles: string[];
  badge?: string;
}

interface NavigationCategory {
  category: string;
  items: NavigationItem[];
}

const Navigation = ({ userRole }: NavigationProps) => {
  const navigate = useNavigate();
  const { canAccessRoute } = usePermissions();

  const navigationItems: NavigationCategory[] = [
    // Core Project Management
    {
      category: "Project Management",
      items: [
        {
          title: "Create Project",
          description: "Start a new construction project",
          icon: Building2,
          path: "/create-project",
          roles: ["admin", "project_manager", "root_admin"]
        },
        {
          title: "Crew Scheduling",
          description: "Schedule and dispatch crew members",
          icon: CalendarDays,
          path: "/crew-scheduling",
          roles: ["admin", "project_manager", "field_supervisor", "root_admin"]
        },
        {
          title: "Time Tracking",
          description: "Track work hours and productivity",
          icon: Clock,
          path: "/time-tracking",
          roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"]
        },
        {
          title: "Daily Reports",
          description: "Create and view daily progress reports",
          icon: Clipboard,
          path: "/daily-reports",
          roles: ["admin", "project_manager", "field_supervisor", "root_admin"]
        },
        {
          title: "Change Orders",
          description: "Manage project change requests",
          icon: Wrench,
          path: "/change-orders",
          roles: ["admin", "project_manager", "root_admin"]
        }
      ]
    },
    // Financial Management
    {
      category: "Financial Management",
      items: [
        {
          title: "Financial Dashboard",
          description: "View budgets, costs, and profitability",
          icon: DollarSign,
          path: "/financial",
          roles: ["admin", "project_manager", "accounting", "root_admin"]
        },
        {
          title: "Reports & Analytics",
          description: "Generate detailed project reports",
          icon: BarChart3,
          path: "/reports",
          roles: ["admin", "project_manager", "accounting", "root_admin"]
        }
      ]
    },
    // Team & Documents
    {
      category: "Team & Documents",
      items: [
        {
          title: "Team Management",
          description: "Manage team members and roles",
          icon: Users,
          path: "/team",
          roles: ["admin", "project_manager", "root_admin"]
        },
        {
          title: "Document Management",
          description: "Store and organize project documents",
          icon: FolderOpen,
          path: "/documents",
          roles: ["admin", "project_manager", "office_staff", "root_admin"]
        }
      ]
    },
    // Root Admin Only
    {
      category: "System Administration",
      items: [
        {
          title: "Companies",
          description: "Manage all registered organizations",
          icon: Building2,
          path: "/admin/companies",
          roles: ["root_admin"],
          badge: "Admin"
        },
        {
          title: "Users",
          description: "Platform user management",
          icon: Users,
          path: "/admin/users",
          roles: ["root_admin"],
          badge: "Admin"
        },
        {
          title: "Billing & Subscriptions",
          description: "Revenue and billing overview",
          icon: DollarSign,
          path: "/admin/billing",
          roles: ["root_admin"],
          badge: "Admin"
        },
        {
          title: "Platform Analytics",
          description: "System-wide metrics and insights",
          icon: TrendingUp,
          path: "/admin/analytics",
          roles: ["root_admin"],
          badge: "Admin"
        },
        {
          title: "Blog Manager",
          description: "Content management system",
          icon: MessageSquare,
          path: "/blog-manager",
          roles: ["root_admin"],
          badge: "Admin"
        },
        {
          title: "System Settings",
          description: "Platform configuration",
          icon: Settings,
          path: "/admin/settings",
          roles: ["root_admin"],
          badge: "Admin"
        }
      ]
    }
  ];

  const getAccessibleItems = () => {
    return navigationItems.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.roles.includes(userRole) || userRole === 'root_admin'
      )
    })).filter(category => category.items.length > 0);
  };

  const accessibleItems = getAccessibleItems();

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Platform Features</h2>
        <p className="text-muted-foreground">
          Access all available tools and features for your role
        </p>
      </div>

      {accessibleItems.map((category) => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>{category.category}</span>
              {category.category === "System Administration" && (
                <Badge variant="destructive" className="ml-2">
                  <Shield className="h-3 w-3 mr-1" />
                  Root Admin
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {category.category === "Project Management" && "Core construction project management tools"}
              {category.category === "Financial Management" && "Budget tracking and financial analysis"}
              {category.category === "Team & Documents" && "Collaboration and document organization"}
              {category.category === "System Administration" && "Platform-wide administration and oversight"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((item) => {
                const hasAccess = canAccessRoute(item.path);
                return (
                  <div
                    key={item.path}
                    className={`border rounded-lg p-4 transition-colors group ${
                      hasAccess 
                        ? 'hover:bg-muted/50 cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed bg-muted/20'
                    }`}
                    onClick={() => hasAccess && navigate(item.path)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {hasAccess ? (
                          <item.icon className="h-8 w-8 text-construction-blue group-hover:text-construction-blue/80" />
                        ) : (
                          <Lock className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`font-medium text-sm ${
                            hasAccess ? 'group-hover:text-construction-blue' : 'text-muted-foreground'
                          }`}>
                            {item.title}
                          </h3>
                          {item.badge && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              {item.badge}
                            </Badge>
                          )}
                          {!hasAccess && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              <Lock className="h-2 w-2 mr-1" />
                              Restricted
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Navigation;