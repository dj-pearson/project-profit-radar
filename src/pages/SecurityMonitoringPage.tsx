import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SecurityMonitoringDashboard } from '@/components/security/SecurityMonitoringDashboard';
import { MobilePageWrapper } from '@/utils/mobileHelpers';

const SecurityMonitoringPage = () => {
  return (
    <DashboardLayout title="Security Monitoring">
      <MobilePageWrapper title="Security Monitoring" className="px-4 sm:px-6">
        <div className="mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor security alerts, configure monitoring rules, and track incident metrics
          </p>
        </div>
        
        <SecurityMonitoringDashboard />
      </MobilePageWrapper>
    </DashboardLayout>
  );
};

export default SecurityMonitoringPage;