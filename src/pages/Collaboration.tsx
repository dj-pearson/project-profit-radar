import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CollaborationHub } from '@/components/collaboration/CollaborationHub';

const Collaboration = () => {
  return (
    <DashboardLayout title="Collaboration">
      <CollaborationHub />
    </DashboardLayout>
  );
};

export default Collaboration;