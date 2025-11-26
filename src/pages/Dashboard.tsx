import { useEffect } from "react";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { SubscriptionUsageWidget } from "@/components/subscription/SubscriptionUsageWidget";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCriticalCSS } from "@/utils/criticalCSSExtractor";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { data, loading: dataLoading } = useDashboardData();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Inject critical CSS for dashboard
  useCriticalCSS('dashboard');

  // Redirect unauthenticated users to auth page
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Redirect users without company to setup
  useEffect(() => {
    if (!authLoading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
  }, [user, userProfile, authLoading, navigate]);

  // Show loading state while auth or data is loading
  if (authLoading || dataLoading) {
    return <DashboardSkeleton />;
  }

  // Don't render dashboard for unauthenticated users
  if (!user) {
    return <DashboardSkeleton />;
  }

  // Show empty state if no data is available (new user/company)
  const hasData = data && (
    data.projects.length > 0 ||
    data.kpis.activeProjects > 0 ||
    data.recentActivity.length > 0
  );

  const handleEmptyAction = (action: string) => {
    const actionMap: Record<string, { route: string; message: string }> = {
      'create_project': {
        route: '/projects/new',
        message: 'Let\'s create your first project'
      },
      'invite_team': {
        route: '/team-management',
        message: 'Time to build your team'
      },
      'setup_companies': {
        route: '/admin/companies',
        message: 'Setting up company management'
      },
      'daily_report': {
        route: '/daily-reports/create',
        message: 'Ready to submit today\'s report'
      },
      'crew_check_in': {
        route: '/time-tracking',
        message: 'Opening crew time tracking'
      },
      'platform_settings': {
        route: '/admin/settings',
        message: 'Configuring platform settings'
      },
      'team_setup': {
        route: '/team-management',
        message: 'Let\'s set up your project team'
      },
      'explore': {
        route: '/features',
        message: 'Exploring BuildDesk features'
      }
    };

    const actionConfig = actionMap[action];
    if (actionConfig) {
      navigate(actionConfig.route);
      toast({
        title: "Let's get started!",
        description: actionConfig.message,
      });
    } else {
      toast({
        title: "Feature coming soon",
        description: "This feature will be available shortly.",
        variant: "default",
      });
    }
  };

  // Show empty dashboard for new users or companies without data
  if (!hasData && userProfile) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <EmptyDashboard
              userRole={userProfile.role}
              onAction={handleEmptyAction}
            />
          </div>
          <div className="lg:col-span-1">
            <SubscriptionUsageWidget />
          </div>
        </div>
        <OnboardingChecklist />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RoleDashboard />
        </div>
        <div className="lg:col-span-1">
          <SubscriptionUsageWidget />
        </div>
      </div>
      <OnboardingChecklist />
    </DashboardLayout>
  );
};

export default Dashboard;