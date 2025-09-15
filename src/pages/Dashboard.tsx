import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BusinessDashboard } from '@/components/dashboard/BusinessDashboard';
import { QuickActions } from '@/components/navigation/QuickActions';
import { FinancialIntelligenceDashboard } from '@/components/dashboard/FinancialIntelligenceDashboard';

const Dashboard = () => {
  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <QuickActions />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <BusinessDashboard />
          <FinancialIntelligenceDashboard />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;