import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PageLayout } from '@/components/layouts/PageLayout';
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
      <PageLayout>
        <CommunicationHub />
      </PageLayout>
    </>
  );
}