import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/dashboard/KPICard';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [dashboardData, setDashboardData] = useState({
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
      loadDashboardData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadDashboardData = async () => {
    try {
      if (userProfile?.role === 'root_admin') {
        await loadRootAdminData();
      } else {
        await loadCompanyData();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data"
      });
    }
  };

  const loadRootAdminData = async () => {
    // Load companies data for root admin
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (companiesError) throw companiesError;
    
    setCompanies(companiesData || []);
    
    // Load all projects for overview
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*, companies(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (projectsError) throw projectsError;
    
    setProjects(projectsData || []);
    
    // Load aggregated stats
    const { data: userCount } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true });

    const { data: activeProjectCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'in_progress']);

    setDashboardData({
      activeProjects: activeProjectCount?.length || 0,
      totalRevenue: 0, // TODO: Calculate from projects/billing
      totalUsers: userCount?.length || 0,
      projectsCompleted: 0 // TODO: Calculate completed projects
    });
  };

  const loadCompanyData = async () => {
    if (!userProfile?.company_id) return;

    // Load company projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;
    
    setProjects(projectsData || []);
    
    // Calculate company stats
    const activeProjects = projectsData?.filter(p => ['active', 'in_progress'].includes(p.status)) || [];
    const completedProjects = projectsData?.filter(p => p.status === 'completed') || [];
    const totalBudget = projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;

    setDashboardData({
      activeProjects: activeProjects.length,
      totalRevenue: totalBudget,
      totalUsers: 0, // TODO: Load team members count
      projectsCompleted: completedProjects.length
    });
  };

  const handleQuickAction = (action: string) => {
    toast({
      title: "Feature Coming Soon",
      description: `${action.replace('_', ' ')} functionality will be available soon.`
    });
  };

  const handleViewProject = (projectId: string) => {
    toast({
      title: "Feature Coming Soon",
      description: "Project detail view will be available soon."
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-construction-blue">Build Desk</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {userProfile?.first_name || user.email}
              </span>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {userProfile?.role === 'root_admin' ? (
            <>
              <KPICard
                title="Total Companies"
                value={companies.length}
                icon={Building2}
                subtitle="Registered organizations"
              />
              <KPICard
                title="Active Projects"
                value={dashboardData.activeProjects}
                icon={BarChart3}
                subtitle="Across all companies"
              />
              <KPICard
                title="Total Users"
                value={dashboardData.totalUsers}
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
                value={dashboardData.activeProjects}
                icon={Building2}
                subtitle="In progress"
              />
              <KPICard
                title="Total Budget"
                value={`$${(dashboardData.totalRevenue / 1000).toFixed(0)}K`}
                icon={DollarSign}
                subtitle="All projects"
              />
              <KPICard
                title="Completed"
                value={dashboardData.projectsCompleted}
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                {projects.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No projects found</p>
                    {(userProfile?.role === 'admin' || userProfile?.role === 'project_manager') && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => handleQuickAction('create_project')}
                      >
                        Create Your First Project
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.slice(0, 4).map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onViewProject={handleViewProject}
                      />
                    ))}
                  </div>
                )}
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
        </div>

        {/* Root Admin Panel */}
        {userProfile?.role === 'root_admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Root Admin Panel</CardTitle>
              <CardDescription>System-wide management and oversight</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="construction" 
                  className="h-24 flex-col"
                  onClick={() => handleQuickAction('companies')}
                >
                  <span className="text-lg font-bold">Companies</span>
                  <span className="text-sm">Manage Organizations</span>
                </Button>
                <Button 
                  variant="construction" 
                  className="h-24 flex-col"
                  onClick={() => handleQuickAction('users')}
                >
                  <span className="text-lg font-bold">Users</span>
                  <span className="text-sm">User Management</span>
                </Button>
                <Button 
                  variant="construction" 
                  className="h-24 flex-col"
                  onClick={() => handleQuickAction('billing')}
                >
                  <span className="text-lg font-bold">Billing</span>
                  <span className="text-sm">Subscription Overview</span>
                </Button>
                <Button 
                  variant="construction" 
                  className="h-24 flex-col"
                  onClick={() => handleQuickAction('analytics')}
                >
                  <span className="text-lg font-bold">Analytics</span>
                  <span className="text-sm">Platform Metrics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;