import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BusinessDashboard } from '@/components/dashboard/BusinessDashboard';

const Dashboard = () => {
  return (
    <DashboardLayout title="Dashboard">
      <BusinessDashboard />
    </DashboardLayout>
  );
};

export default Dashboard;