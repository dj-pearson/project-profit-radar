import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";

const Dashboard = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const { data, loading: dataLoading } = useDashboardData();

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
      <EmptyDashboard 
        userRole={userProfile.role} 
        onAction={handleEmptyAction}
      />
    );
  }

  return <RoleDashboard />;
};

export default Dashboard;