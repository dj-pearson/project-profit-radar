import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BusinessDashboard } from '@/components/dashboard/BusinessDashboard';
import { QuickActions } from '@/components/navigation/QuickActions';

const Dashboard = () => {
  return (
    <DashboardLayout title="Dashboard">
      <QuickActions />
      <BusinessDashboard />
    </DashboardLayout>
  );
};

export default Dashboard;