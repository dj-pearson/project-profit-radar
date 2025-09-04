import React from "react";
import { Helmet } from "react-helmet-async";
import { PageLayout } from "@/components/layouts/PageLayout";
import SmartClientUpdates from "@/components/workflow/SmartClientUpdates";

const SmartClientUpdatesPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Smart Client Updates - BuildDesk</title>
        <meta
          name="description"
          content="Automate client communications based on project events with intelligent templates and triggers."
        />
      </Helmet>
      <PageLayout>
        <SmartClientUpdates />
      </PageLayout>
    </>
  );
};

export default SmartClientUpdatesPage;
