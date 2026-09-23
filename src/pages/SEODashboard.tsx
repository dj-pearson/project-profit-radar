import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import SEOManager from '@/components/admin/SEOManager';

const SEODashboard = () => {
  return (
    <AccessiblePageWrapper pageTitle="SEO Management">
    <DashboardLayout hasAccessibleWrapper title="SEO Management">
      <SEOManager />
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default SEODashboard;
