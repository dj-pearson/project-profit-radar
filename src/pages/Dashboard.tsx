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

  // Clear OAuth hash params immediately to prevent redirect to Supabase Studio
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token=') || hash.includes('refresh_token='))) {
      // Clear hash silently - no logging needed for routine OAuth cleanup
      // Remove hash without reloading page
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Redirect users without company to setup (but NOT back to auth - let ProtectedRoute handle that)
  useEffect(() => {
    if (
      !authLoading &&
      user &&
      userProfile &&
      !userProfile.company_id &&
      userProfile.role !== 'root_admin'
    ) {
      navigate('/setup');
    }
  }, [user, userProfile, authLoading, navigate]);

  // Show loading state while auth or data is loading
  if (authLoading || dataLoading || !user || !userProfile) {
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" role="region" aria-label="Dashboard content">
          <section className="lg:col-span-2" aria-label="Getting started">
            <EmptyDashboard
              userRole={userProfile.role}
              onAction={handleEmptyAction}
            />
          </section>
          <aside className="lg:col-span-1" aria-label="Subscription usage">
            <SubscriptionUsageWidget />
          </aside>
        </div>
        <section aria-label="Onboarding progress">
          <OnboardingChecklist />
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" role="region" aria-label="Dashboard content">
        <section className="lg:col-span-2" aria-label="Dashboard overview">
          <RoleDashboard />
        </section>
        <aside className="lg:col-span-1" aria-label="Subscription usage">
          <SubscriptionUsageWidget />
        </aside>
      </div>
      <section aria-label="Onboarding progress">
        <OnboardingChecklist />
      </section>
    </DashboardLayout>
  );
};

export default Dashboard;