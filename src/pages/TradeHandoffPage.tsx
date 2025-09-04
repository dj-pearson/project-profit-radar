import React from "react";
import { Helmet } from "react-helmet-async";
import { PageLayout } from "@/components/layout/PageLayout";
import TradeHandoffManager from "@/components/workflow/TradeHandoffManager";
import { useParams } from "react-router-dom";

export default function TradeHandoffPage() {
  const { projectId } = useParams();

  // For now, we'll use a default project ID if none is provided
  // In a real implementation, this would come from route params or context
  const currentProjectId = projectId || "default-project-id";

  return (
    <>
      <Helmet>
        <title>Trade Handoff Coordination | Construction Management Platform</title>
        <meta
          name="description"
          content="Manage trade transitions, quality checks, and coordination meetings for construction projects."
        />
      </Helmet>
      <PageLayout>
        <TradeHandoffManager projectId={currentProjectId} />
      </PageLayout>
    </>
  );
}
