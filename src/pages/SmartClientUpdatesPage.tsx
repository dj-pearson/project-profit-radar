import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import SmartClientUpdates from "@/components/workflow/SmartClientUpdates";

const SmartClientUpdatesPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Smart Client Updates - Brikly</title>
        <meta
          name="description"
          content="Automate client communications based on project events with intelligent templates and triggers."
        />
      </Helmet>
      <AccessiblePageWrapper pageTitle="Smart Client Updates">
      <DashboardLayout hasAccessibleWrapper>
        <SmartClientUpdates />
      </DashboardLayout>
      </AccessiblePageWrapper>
    </>
  );
};

export default SmartClientUpdatesPage;
