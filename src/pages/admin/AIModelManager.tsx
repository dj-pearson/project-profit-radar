import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import AIModelManager from '@/components/admin/AIModelManager';

const AIModelManagerPage = () => {
  return (
    <AccessiblePageWrapper pageTitle="AI Model Management">
    <DashboardLayout hasAccessibleWrapper title="AI Model Management">
      <section aria-label="AI Model Management">
        <AIModelManager />
      </section>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default AIModelManagerPage;