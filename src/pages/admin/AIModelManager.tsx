import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import AIModelManager from '@/components/admin/AIModelManager';

const AIModelManagerPage = () => {
  return (
    <DashboardLayout title="AI Model Management">
      <AIModelManager />
    </DashboardLayout>
  );
};

export default AIModelManagerPage;