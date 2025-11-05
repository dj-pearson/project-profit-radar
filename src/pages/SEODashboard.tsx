import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import SEOManager from '@/components/admin/SEOManager';

const SEODashboard = () => {
  return (
    <DashboardLayout title="SEO Management">
      <SEOManager />
    </DashboardLayout>
  );
};

export default SEODashboard;
