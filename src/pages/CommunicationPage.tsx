import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { CommunicationHub } from '@/components/communication/CommunicationHub';

export default function CommunicationPage() {
  return (
    <>
      <Helmet>
        <title>Communication Hub | Construction Management Platform</title>
        <meta
          name="description"
          content="Project messaging, RFIs and meeting scheduling for construction teams."
        />
      </Helmet>
      <AccessiblePageWrapper pageTitle="Communication Hub">
      <DashboardLayout hasAccessibleWrapper
        title="Communication Hub"
        description="Project messaging, RFIs and meetings in one place."
      >
        <CommunicationHub />
      </DashboardLayout>
      </AccessiblePageWrapper>
    </>
  );
}