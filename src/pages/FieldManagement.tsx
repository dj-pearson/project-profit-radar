import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { ConstructionDashboard } from '@/components/ConstructionDashboard';

const FieldManagement: React.FC = () => {
  return (
    <AccessiblePageWrapper pageTitle="Field Management">
    <DashboardLayout hasAccessibleWrapper title="Field Management">
      {/* Rendering existing Field Management experience inside the standard app layout */}
      <ConstructionDashboard />
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default FieldManagement;
