import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConstructionDashboard } from '@/components/ConstructionDashboard';

const FieldManagement: React.FC = () => {
  return (
    <DashboardLayout title="Field Management">
      {/* Rendering existing Field Management experience inside the standard app layout */}
      <ConstructionDashboard />
    </DashboardLayout>
  );
};

export default FieldManagement;
