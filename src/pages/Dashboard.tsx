import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { mobileGridClasses, mobileTextClasses, MobilePageWrapper } from '@/utils/mobileHelpers';
import { DragDropDashboard } from '@/components/dashboard/DragDropDashboard';

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
    <DashboardLayout title="Build Desk">
      {/* Drag & Drop Dashboard Tiles */}
      <DragDropDashboard />

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

      <ProjectWizard
        open={projectWizardOpen}
        onOpenChange={setProjectWizardOpen}
      />
    </DashboardLayout>
  );
};

export default Dashboard;