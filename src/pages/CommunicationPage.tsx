import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CommunicationHub } from '@/components/communication/CommunicationHub';

export default function CommunicationPage() {
  return (
    <>
      <Helmet>
        <title>Communication Hub | Construction Management Platform</title>
        <meta
          name="description"
          content="Project messaging, client portal, notifications, and automated updates for construction teams."
        />
      </Helmet>
      <DashboardLayout
        title="Communication Hub"
        description="Project messaging and automated updates. RFI tracking and meeting scheduling are not built yet; those tabs say so rather than showing an empty list."
      >
        <CommunicationHub />
      </DashboardLayout>
    </>
  );
}