import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCriticalCSS } from "@/utils/criticalCSSExtractor";

const Dashboard = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const { data, loading: dataLoading } = useDashboardData();
  
  // Inject critical CSS for dashboard
  useCriticalCSS('dashboard');

  // Show loading state while auth or data is loading
  if (authLoading || dataLoading) {
    return <DashboardSkeleton />;
  }

  // Show empty state if no data is available (new user/company)
  const hasData = data && (
    data.projects.length > 0 || 
    data.kpis.activeProjects > 0 || 
    data.recentActivity.length > 0
  );

  const handleEmptyAction = (action: string) => {
    console.log('Empty dashboard action:', action);
    // TODO: Add navigation logic for empty state actions
    // Example: navigate to create project page, invite users, etc.
  };

  // Show empty dashboard for new users or companies without data
  if (!hasData && userProfile) {
    return (
      <DashboardLayout title="Dashboard">
        <EmptyDashboard 
          userRole={userProfile.role} 
          onAction={handleEmptyAction}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <RoleDashboard />
    </DashboardLayout>
  );
};

export default Dashboard;