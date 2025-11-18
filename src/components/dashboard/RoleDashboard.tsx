import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useToast } from "@/hooks/use-toast";
import { KPICard } from "./KPICard";
import { ProjectHealthIndicator } from "./ProjectHealthIndicator";
import { QuickActions } from "./QuickActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Clock,
  Shield,
  Settings,
  Bell,
  ChevronRight,
  Activity,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export const RoleDashboard = () => {
  const { userProfile } = useAuth();
  const { data: dashboardData, loading, error, refetch } = useDashboardData();
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleQuickAction = (action: string) => {
    const actionMap: Record<string, { route: string; message: string }> = {
      'companies': {
        route: '/admin/companies',
        message: 'Opening company management'
      },
      'users': {
        route: '/admin/users',
        message: 'Opening system users'
      },
      'analytics': {
        route: '/admin/analytics',
        message: 'Loading platform analytics'
      },
      'settings': {
        route: '/admin/settings',
        message: 'Opening system settings'
      },
      'create_project': {
        route: '/projects/new',
        message: 'Creating new project'
      },
      'manage_team': {
        route: '/team-management',
        message: 'Opening team management'
      },
      'job_costing': {
        route: '/financial/job-costing',
        message: 'Loading job costing'
      },
      'documents': {
        route: '/documents',
        message: 'Opening document management'
      },
      'reports': {
        route: '/reports',
        message: 'Loading reports'
      },
      'daily_report': {
        route: '/daily-reports/create',
        message: 'Creating daily report'
      },
      'time_tracking': {
        route: '/time-tracking',
        message: 'Opening time tracking'
      },
      'crew_management': {
        route: '/crew-management',
        message: 'Managing crew assignments'
      },
      'invoicing': {
        route: '/invoicing',
        message: 'Opening invoicing'
      },
      'financial_reports': {
        route: '/reports/financial',
        message: 'Loading financial reports'
      }
    };

    const actionConfig = actionMap[action];
    if (actionConfig) {
      navigate(actionConfig.route);
      toast({
        title: "Quick Action",
        description: actionConfig.message,
      });
    } else {
      toast({
        title: "Navigation",
        description: `Opening ${action}...`,
        variant: "default",
      });
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const getWelcomeMessage = () => {
    const role = userProfile?.role;
    const firstName = userProfile?.first_name || 'User';
    
    switch (role) {
      case 'root_admin':
        return `Welcome back, ${firstName}. Platform overview at a glance.`;
      case 'admin':
        return `Good morning, ${firstName}. Your company operations dashboard.`;
      case 'project_manager':
        return `Hello, ${firstName}. Here's your project portfolio status.`;
      case 'field_supervisor':
        return `Hey, ${firstName}. Ready for another productive day in the field?`;
      case 'accounting':
        return `Welcome, ${firstName}. Financial health and reporting center.`;
      default:
        return `Welcome back, ${firstName}. Your construction management hub.`;
    }
  };

  const getRoleSpecificKPIs = () => {
    if (!dashboardData) return [];
    
    const role = userProfile?.role;
    const { kpis } = dashboardData;

    switch (role) {
      case 'root_admin':
        return [
          {
            title: "Total Platform Revenue",
            value: kpis.totalRevenue,
            icon: <DollarSign className="h-4 w-4" />,
            change: 12.3,
            trend: 'up' as const,
            status: 'success' as const
          },
          {
            title: "Active Companies",
            value: "47",
            icon: <Building2 className="h-4 w-4" />,
            change: 8.1,
            trend: 'up' as const,
            status: 'success' as const
          },
          {
            title: "Platform Users",
            value: "1,247",
            icon: <Users className="h-4 w-4" />,
            change: 15.2,
            trend: 'up' as const,
            status: 'info' as const
          },
          {
            title: "System Health",
            value: "99.8%",
            icon: <Activity className="h-4 w-4" />,
            subtitle: "Uptime",
            status: 'success' as const
          }
        ];

      case 'field_supervisor':
        return [
          {
            title: "Active Crew",
            value: kpis.teamMembers,
            icon: <Users className="h-4 w-4" />,
            subtitle: "On site today",
            status: 'info' as const
          },
          {
            title: "Safety Score",
            value: `${kpis.safetyScore}%`,
            icon: <Shield className="h-4 w-4" />,
            change: 2.1,
            trend: 'up' as const,
            status: kpis.safetyScore >= 95 ? 'success' : 'warning'
          },
          {
            title: "Today's Progress",
            value: "78%",
            icon: <TrendingUp className="h-4 w-4" />,
            subtitle: "Tasks completed",
            progress: 78,
            status: 'info' as const
          }
        ];

      case 'accounting':
        return [
          {
            title: "Monthly Revenue",
            value: kpis.totalRevenue,
            icon: <DollarSign className="h-4 w-4" />,
            change: 5.2,
            trend: 'up' as const,
            status: 'success' as const
          },
          {
            title: "Profit Margin",
            value: `${kpis.profitMargin}%`,
            icon: <TrendingUp className="h-4 w-4" />,
            change: -1.2,
            trend: 'down' as const,
            status: 'warning' as const
          },
          {
            title: "Outstanding Invoices",
            value: "$127K",
            icon: <Calendar className="h-4 w-4" />,
            subtitle: "Past due",
            status: 'warning' as const
          }
        ];

      default:
        return [
          {
            title: "Active Projects",
            value: kpis.activeProjects,
            icon: <Building2 className="h-4 w-4" />,
            change: 3.2,
            trend: 'up' as const,
            status: 'success' as const
          },
          {
            title: "Completion Rate",
            value: `${kpis.completionRate}%`,
            icon: <TrendingUp className="h-4 w-4" />,
            change: 1.8,
            trend: 'up' as const,
            progress: kpis.completionRate,
            status: 'info' as const
          },
          {
            title: "Team Members",
            value: kpis.teamMembers,
            icon: <Users className="h-4 w-4" />,
            subtitle: "Active users",
            status: 'info' as const
          },
          {
            title: "Safety Score",
            value: `${kpis.safetyScore}%`,
            icon: <Shield className="h-4 w-4" />,
            change: 2.1,
            trend: 'up' as const,
            status: kpis.safetyScore >= 95 ? 'success' : 'warning'
          }
        ];
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Dashboard Error</h2>
          <p className="text-muted-foreground mb-4">{error?.message || 'An unexpected error occurred'}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
          <p className="text-muted-foreground mb-4">
            No dashboard data found. Please check your account setup or try refreshing.
          </p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                Good morning, {userProfile?.first_name || 'User'}
              </h1>
              <p className="text-muted-foreground">
                {getWelcomeMessage()}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="capitalize">
                {userProfile?.role?.replace('_', ' ')}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {getRoleSpecificKPIs().map((kpi, index) => (
                <KPICard key={index} {...kpi} />
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column - 3/4 width */}
              <div className="lg:col-span-3 space-y-6">
                {/* Project Health - only show for relevant roles */}
                {['admin', 'project_manager', 'root_admin'].includes(userProfile?.role || '') && dashboardData && (
                  <ProjectHealthIndicator projects={dashboardData.projects} />
                )}
                
                {/* Critical Alerts */}
                {dashboardData && dashboardData.alerts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Critical Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dashboardData.alerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          getSeverityColor(alert.severity)
                        )}>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{alert.message}</p>
                            {alert.project && (
                              <p className="text-xs opacity-75 mt-1">{alert.project}</p>
                            )}
                          </div>
                          <div className="text-xs opacity-75">
                            {alert.timestamp}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Sidebar - 1/4 width */}
              <div className="space-y-6">
                <QuickActions 
                  userRole={userProfile?.role || ''} 
                  onAction={handleQuickAction}
                />
                
                {/* Recent Activity */}
                {dashboardData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dashboardData.recentActivity.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {activity.action}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {activity.user}
                            </p>
                            {activity.project && (
                              <p className="text-xs text-muted-foreground">
                                {activity.project}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {activity.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                      <Button variant="ghost" className="w-full justify-between text-xs">
                        View all activity
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            {dashboardData && (
              <ProjectHealthIndicator projects={dashboardData.projects} />
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            {dashboardData && (
              <Card>
                <CardHeader>
                  <CardTitle>All Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboardData.alerts.map((alert) => (
                    <div key={alert.id} className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      getSeverityColor(alert.severity)
                    )}>
                      <div className="flex-1">
                        <p className="font-medium">{alert.message}</p>
                        {alert.project && (
                          <p className="text-sm opacity-75 mt-1">{alert.project}</p>
                        )}
                      </div>
                      <div className="text-sm opacity-75">
                        {alert.timestamp}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            {dashboardData && (
              <Card>
                <CardHeader>
                  <CardTitle>Activity Feed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dashboardData.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-3 border-l-2 border-primary/20">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1"></div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">
                          by {activity.user}
                        </p>
                        {activity.project && (
                          <p className="text-sm text-muted-foreground">
                            Project: {activity.project}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};