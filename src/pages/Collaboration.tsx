import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { CollaborationHub } from '@/components/collaboration/CollaborationHub';

const Collaboration = () => {
  return (
    <AccessiblePageWrapper pageTitle="Collaboration">
    <DashboardLayout hasAccessibleWrapper title="Collaboration">
      <CollaborationHub />
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default Collaboration;