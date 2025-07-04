import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { KPICard } from '@/components/dashboard/KPICard';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import TrialStatusBanner from '@/components/TrialStatusBanner';
import ProjectWizard from '@/components/ProjectWizard';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorBoundary, ErrorState, EmptyState } from '@/components/ui/error-boundary';
import { KPISkeleton, ProjectCardSkeleton } from '@/components/ui/skeleton-loader';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { useLoadingState } from '@/hooks/useLoadingState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Building2, 
  DollarSign, 
  Users, 
  BarChart3, 
  TrendingUp,
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  const { user, userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [projectWizardOpen, setProjectWizardOpen] = useState(false);
  const { 
    data: dashboardData, 
    loading: dashboardLoading, 
    error: dashboardError, 
    execute: loadDashboard 
  } = useLoadingState({
    projects: [],
    companies: [],
    activeProjects: 0,
    totalRevenue: 0,
    totalUsers: 0,
    projectsCompleted: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    // If user doesn't have a company, redirect to setup
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    // Load dashboard data once user is authenticated
    if (!loading && user && userProfile) {
      loadDashboard(loadDashboardData);
    }
  }, [user, userProfile, loading, navigate]);

  const loadDashboardData = async () => {
    if (userProfile?.role === 'root_admin') {
      return await loadRootAdminData();
    } else {
      return await loadCompanyData();
    }
  };

  const loadRootAdminData = async () => {
    // Load companies data for root admin
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (companiesError) throw companiesError;
    
    // Load all projects for overview
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*, companies(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (projectsError) throw projectsError;
    
    // Load aggregated stats
    const { data: userCount } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true });

    const { data: activeProjectCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'in_progress']);

    return {
      companies: companiesData || [],
      projects: projectsData || [],
      activeProjects: activeProjectCount?.length || 0,
      totalRevenue: 0, // TODO: Calculate from projects/billing
      totalUsers: userCount?.length || 0,
      projectsCompleted: 0 // TODO: Calculate completed projects
    };
  };

  const loadCompanyData = async () => {
    if (!userProfile?.company_id) {
      return {
        companies: [],
        projects: [],
        activeProjects: 0,
        totalRevenue: 0,
        totalUsers: 0,
        projectsCompleted: 0
      };
    }

    // Load company projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;
    
    // Calculate company stats
    const activeProjects = projectsData?.filter(p => ['active', 'in_progress'].includes(p.status)) || [];
    const completedProjects = projectsData?.filter(p => p.status === 'completed') || [];
    const totalBudget = projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;

    return {
      companies: [],
      projects: projectsData || [],
      activeProjects: activeProjects.length,
      totalRevenue: totalBudget,
      totalUsers: 0, // TODO: Load team members count
      projectsCompleted: completedProjects.length
    };
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create_project':
        setProjectWizardOpen(true);
        break;
      case 'manage_team':
        navigate('/team');
        break;
      case 'time_tracking':
        navigate('/time-tracking');
        break;
      case 'documents':
        navigate('/documents');
        break;
      case 'job_costing':
      case 'financial_reports':
        navigate('/financial');
        break;
      case 'daily_reports':
        navigate('/daily-reports');
        break;
      case 'change_orders':
        navigate('/change-orders');
        break;
      case 'materials':
        navigate('/materials');
        break;
      case 'equipment':
        navigate('/equipment');
        break;
      default:
        toast({
          title: "Feature Coming Soon",
          description: `${action.replace('_', ' ')} functionality will be available soon.`
        });
    }
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (!user) {
    return null;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'root_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'project_manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1">
          {/* Header */}
          <nav className="border-b bg-background/95 backdrop-blur-sm">
            <div className="flex justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
              <div className="flex items-center min-w-0 flex-1">
                <SidebarTrigger className="mr-2 sm:mr-3 flex-shrink-0" />
                <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-foreground truncate">Build Desk</h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-shrink-0">
                <span className="hidden md:block text-xs sm:text-sm text-muted-foreground truncate max-w-32 lg:max-w-none">
                  Welcome, {userProfile?.first_name || user.email}
                </span>
                <ThemeToggle />
                <Button variant="outline" size="sm" className="hidden sm:flex text-xs lg:text-sm px-2 lg:px-3" onClick={signOut}>
                  Sign Out
                </Button>
                <Button variant="outline" size="sm" className="sm:hidden text-xs px-2" onClick={signOut}>
                  Exit
                </Button>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <ResponsiveContainer className="py-4 sm:py-6" padding="sm">
            <TrialStatusBanner />
        
        {/* KPI Cards */}
        <ErrorBoundary>
          {dashboardLoading ? (
            <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} className="mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <KPISkeleton key={i} />
              ))}
            </ResponsiveGrid>
          ) : dashboardError ? (
            <ErrorState 
              error={dashboardError} 
              onRetry={() => loadDashboard(loadDashboardData)}
              className="mb-8"
            />
          ) : (
            <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} className="mb-8">
              {userProfile?.role === 'root_admin' ? (
                <>
                  <KPICard
                    title="Total Companies"
                    value={dashboardData?.companies?.length || 0}
                    icon={Building2}
                    subtitle="Registered organizations"
                  />
                  <KPICard
                    title="Active Projects"
                    value={dashboardData?.activeProjects || 0}
                    icon={BarChart3}
                    subtitle="Across all companies"
                  />
                  <KPICard
                    title="Total Users"
                    value={dashboardData?.totalUsers || 0}
                    icon={Users}
                    subtitle="Platform users"
                  />
                  <KPICard
                    title="System Health"
                    value="99.9%"
                    icon={TrendingUp}
                    subtitle="Uptime"
                    change="+0.1%"
                    changeType="positive"
                  />
                </>
              ) : (
                <>
                  <KPICard
                    title="Active Projects"
                    value={dashboardData?.activeProjects || 0}
                    icon={Building2}
                    subtitle="In progress"
                  />
                  <KPICard
                    title="Total Budget"
                    value={`$${((dashboardData?.totalRevenue || 0) / 1000).toFixed(0)}K`}
                    icon={DollarSign}
                    subtitle="All projects"
                  />
                  <KPICard
                    title="Completed"
                    value={dashboardData?.projectsCompleted || 0}
                    icon={BarChart3}
                    subtitle="Projects finished"
                  />
                  <KPICard
                    title="This Month"
                    value="$0"
                    icon={Calendar}
                    subtitle="Revenue"
                  />
                </>
              )}
            </ResponsiveGrid>
          )}
        </ErrorBoundary>

        {/* Main Content Grid */}
        <ResponsiveGrid cols={{ default: 1, lg: 3 }} gap="sm" className="mb-8">
          {/* Projects Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {userProfile?.role === 'root_admin' ? 'Recent Projects' : 'Your Projects'}
                </CardTitle>
                <CardDescription>
                  {userProfile?.role === 'root_admin' 
                    ? 'Latest projects across all companies' 
                    : 'Overview of your active and recent projects'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  {dashboardLoading ? (
                    <ResponsiveGrid cols={{ default: 1, md: 2 }} className="gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <ProjectCardSkeleton key={i} />
                      ))}
                    </ResponsiveGrid>
                  ) : !dashboardData?.projects?.length ? (
                    <EmptyState
                      icon={Building2}
                      title="No projects found"
                      description={userProfile?.role === 'root_admin' 
                        ? "No projects have been created yet across all companies."
                        : "Get started by creating your first project."
                      }
                      action={
                        (userProfile?.role === 'admin' || userProfile?.role === 'project_manager') 
                          ? { label: "Create Your First Project", onClick: () => setProjectWizardOpen(true) }
                          : undefined
                      }
                    />
                  ) : (
                    <ResponsiveGrid cols={{ default: 1, md: 2 }} className="gap-4">
                      {dashboardData.projects.slice(0, 4).map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onViewProject={handleViewProject}
                        />
                      ))}
                    </ResponsiveGrid>
                  )}
                </ErrorBoundary>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <QuickActions 
              userRole={userProfile?.role || ''}
              onAction={handleQuickAction}
            />
            
            <RecentActivity 
              activities={[
                {
                  id: '1',
                  type: 'project_update',
                  title: 'Project Updated',
                  description: 'Kitchen Remodel progress updated to 75%',
                  timestamp: new Date().toISOString(),
                  user: 'John Doe'
                },
                {
                  id: '2',
                  type: 'alert',
                  title: 'Budget Alert',
                  description: 'Office Build project approaching budget limit',
                  timestamp: new Date(Date.now() - 86400000).toISOString(),
                  urgent: true
                }
              ]}
            />

            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">
                    {userProfile?.first_name && userProfile?.last_name 
                      ? `${userProfile.first_name} ${userProfile.last_name}`
                      : user?.email
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <Badge variant={getRoleBadgeVariant(userProfile?.role || '')}>
                    {userProfile?.role?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </ResponsiveGrid>

        {/* Root Admin Panel */}
        {userProfile?.role === 'root_admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Root Admin Panel</CardTitle>
              <CardDescription>System-wide management and oversight</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <Button 
                  variant="construction" 
                  className="h-20 sm:h-24 flex-col p-2"
                  onClick={() => navigate('/admin/companies')}
                >
                  <span className="text-sm sm:text-lg font-bold">Companies</span>
                  <span className="text-xs sm:text-sm text-center">Manage Organizations</span>
                </Button>
                <Button 
                  variant="construction" 
                  className="h-20 sm:h-24 flex-col p-2"
                  onClick={() => navigate('/admin/users')}
                >
                  <span className="text-sm sm:text-lg font-bold">Users</span>
                  <span className="text-xs sm:text-sm text-center">User Management</span>
                </Button>
                <Button 
                  variant="construction" 
                  className="h-20 sm:h-24 flex-col p-2"
                  onClick={() => navigate('/admin/billing')}
                >
                  <span className="text-sm sm:text-lg font-bold">Billing</span>
                  <span className="text-xs sm:text-sm text-center">Subscription Overview</span>
                </Button>
                <Button 
                  variant="construction" 
                  className="h-20 sm:h-24 flex-col p-2"
                  onClick={() => navigate('/blog-manager')}
                >
                  <span className="text-sm sm:text-lg font-bold">Blog</span>
                  <span className="text-xs sm:text-sm text-center">Content Management</span>
                </Button>
                <Button 
                  variant="construction" 
                  className="h-20 sm:h-24 flex-col p-2"
                  onClick={() => navigate('/admin/analytics')}
                >
                  <span className="text-sm sm:text-lg font-bold">Analytics</span>
                  <span className="text-xs sm:text-sm text-center">Platform Metrics</span>
                </Button>
                <Button 
                  variant="construction" 
                  className="h-20 sm:h-24 flex-col p-2"
                  onClick={() => navigate('/admin/settings')}
                >
                  <span className="text-sm sm:text-lg font-bold">Settings</span>
                  <span className="text-xs sm:text-sm text-center">System Configuration</span>
                </Button>
                <Button 
                  variant="construction" 
                  className="h-20 sm:h-24 flex-col p-2"
                  onClick={() => navigate('/admin/seo')}
                >
                  <span className="text-sm sm:text-lg font-bold">SEO Manager</span>
                  <span className="text-sm">Search Optimization</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
          </ResponsiveContainer>
        </div>
        
        {/* Project Wizard */}
        <ProjectWizard 
          open={projectWizardOpen} 
          onOpenChange={setProjectWizardOpen} 
        />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;