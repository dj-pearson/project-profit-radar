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
  CalendarDays,
  Brain,
  AlertTriangle,
  Zap,
  ShoppingCart,
  PieChart,
  UserCheck,
  Receipt,
  FileBarChart,
  MapPin,
  Key,
  Webhook,
  Code2,
  UserCog,
  FileCheck,
  LifeBuoy,
  Search,
  Share2,
  Users2,
  Filter,
  Megaphone,
  Target,
  Activity,
  Coins,
  LineChart,
  Database,
  ShieldCheck,
  ClipboardCheck
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
          title: "GPS Time Tracking",
          description: "Location-based time tracking with geofencing",
          icon: MapPin,
          path: "/admin/gps-tracking",
          roles: ["admin", "project_manager", "field_supervisor", "root_admin"],
          badge: "New"
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
        },
        {
          title: "Workflow Management",
          description: "Comprehensive workflow tools",
          icon: MessageSquare,
          path: "/workflow-management",
          roles: ["admin", "project_manager", "office_staff", "root_admin"]
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
    // AI & Intelligence
    {
      category: "AI & Intelligence",
      items: [
        {
          title: "AI Estimating",
          description: "ML-powered cost prediction and bidding",
          icon: Brain,
          path: "/admin/ai-estimating",
          roles: ["admin", "project_manager", "root_admin"],
          badge: "New"
        },
        {
          title: "Risk Prediction",
          description: "Predictive analytics for project risks",
          icon: AlertTriangle,
          path: "/admin/risk-prediction",
          roles: ["admin", "project_manager", "root_admin"],
          badge: "New"
        },
        {
          title: "Auto-Scheduling",
          description: "AI-optimized crew scheduling",
          icon: Zap,
          path: "/admin/auto-scheduling",
          roles: ["admin", "project_manager", "root_admin"],
          badge: "New"
        },
        {
          title: "Safety Automation",
          description: "OSHA compliance tracking",
          icon: Shield,
          path: "/admin/safety-automation",
          roles: ["admin", "project_manager", "field_supervisor", "root_admin"],
          badge: "New"
        },
        {
          title: "Smart Procurement",
          description: "AI material forecasting & supplier optimization",
          icon: ShoppingCart,
          path: "/admin/smart-procurement",
          roles: ["admin", "project_manager", "root_admin"],
          badge: "New"
        },
        {
          title: "Advanced Dashboards",
          description: "Real-time financial insights & KPIs",
          icon: PieChart,
          path: "/admin/advanced-dashboards",
          roles: ["admin", "project_manager", "accounting", "root_admin"],
          badge: "New"
        },
        {
          title: "Client Portal Pro",
          description: "Enhanced client collaboration",
          icon: UserCheck,
          path: "/admin/client-portal-pro",
          roles: ["admin", "project_manager", "root_admin"],
          badge: "New"
        },
        {
          title: "Billing Automation",
          description: "Automated invoicing & payment reminders",
          icon: Receipt,
          path: "/admin/billing-automation",
          roles: ["admin", "accounting", "root_admin"],
          badge: "New"
        },
        {
          title: "Reporting Engine",
          description: "Custom report builder with scheduling",
          icon: FileBarChart,
          path: "/admin/reporting-engine",
          roles: ["admin", "project_manager", "accounting", "root_admin"],
          badge: "New"
        },
        {
          title: "AI Model Manager",
          description: "Configure and manage AI models",
          icon: Settings,
          path: "/admin/ai-models",
          roles: ["admin", "root_admin"],
          badge: "New"
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
    // Developer Tools
    {
      category: "Developer Tools",
      items: [
        {
          title: "API Keys",
          description: "Manage API authentication keys",
          icon: Key,
          path: "/admin/api-keys",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "Webhooks",
          description: "Configure event webhooks",
          icon: Webhook,
          path: "/admin/webhooks",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "Developer Portal",
          description: "API documentation and testing",
          icon: Code2,
          path: "/admin/developer-portal",
          roles: ["admin", "root_admin"],
          badge: "New"
        }
      ]
    },
    // Marketing & Growth
    {
      category: "Marketing & Growth",
      items: [
        {
          title: "Lead Management",
          description: "Track and nurture sales leads",
          icon: Users2,
          path: "/admin/lead-management",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "Demo Management",
          description: "Schedule and track product demos",
          icon: Calendar,
          path: "/admin/demo-management",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "SEO Manager",
          description: "Search engine optimization tools",
          icon: Search,
          path: "/admin/seo-manager",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "Social Media",
          description: "Social media content management",
          icon: Share2,
          path: "/admin/social-media",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "Promotions",
          description: "Manage campaigns and promotions",
          icon: Megaphone,
          path: "/admin/promotions",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "Funnel Manager",
          description: "Track and optimize conversion funnels",
          icon: Filter,
          path: "/admin/funnel-manager",
          roles: ["admin", "root_admin"],
          badge: "New"
        }
      ]
    },
    // Advanced Analytics
    {
      category: "Advanced Analytics",
      items: [
        {
          title: "Conversion Analytics",
          description: "Track conversion metrics and rates",
          icon: Target,
          path: "/admin/conversion-analytics",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "Retention Analytics",
          description: "Customer retention and churn analysis",
          icon: Activity,
          path: "/admin/retention-analytics",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "Revenue Analytics",
          description: "Revenue tracking and forecasting",
          icon: Coins,
          path: "/admin/revenue-analytics",
          roles: ["admin", "root_admin"],
          badge: "New"
        },
        {
          title: "Churn Prediction",
          description: "AI-powered churn risk prediction",
          icon: LineChart,
          path: "/admin/churn-prediction",
          roles: ["admin", "root_admin"],
          badge: "New"
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
          title: "Tenant Management",
          description: "Multi-tenant configuration and isolation",
          icon: Database,
          path: "/admin/tenants",
          roles: ["root_admin"],
          badge: "Admin"
        },
        {
          title: "Permission Management",
          description: "Role-based access control configuration",
          icon: ShieldCheck,
          path: "/admin/permissions",
          roles: ["root_admin"],
          badge: "Admin"
        },
        {
          title: "SSO Management",
          description: "Single sign-on configuration",
          icon: Key,
          path: "/admin/sso",
          roles: ["root_admin"],
          badge: "Admin"
        },
        {
          title: "Audit & Compliance",
          description: "Security audit logs and compliance reporting",
          icon: ClipboardCheck,
          path: "/admin/audit",
          roles: ["root_admin"],
          badge: "Admin"
        },
        {
          title: "Support Tickets",
          description: "Customer support ticket management",
          icon: LifeBuoy,
          path: "/admin/support-tickets",
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
              {category.category === "AI & Intelligence" && "AI-powered analytics, automation, and predictive insights"}
              {category.category === "Team & Documents" && "Collaboration and document organization"}
              {category.category === "Developer Tools" && "API integration and webhook management"}
              {category.category === "Marketing & Growth" && "Lead generation, SEO, and customer acquisition tools"}
              {category.category === "Advanced Analytics" && "Conversion tracking, retention metrics, and revenue insights"}
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