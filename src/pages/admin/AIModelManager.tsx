import { DashboardLayout } from '@/components/layout/DashboardLayout';
import AIModelManager from '@/components/admin/AIModelManager';

const AIModelManagerPage = () => {
  return (
    <DashboardLayout title="AI Model Management">
      <section aria-label="AI Model Management">
        <AIModelManager />
      </section>
    </DashboardLayout>
  );
};

export default AIModelManagerPage;