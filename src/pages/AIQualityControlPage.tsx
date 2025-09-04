import React from "react";
import { Helmet } from "react-helmet-async";
import { PageLayout } from "@/components/layouts/PageLayout";
import AIQualityControlDashboard from "@/components/quality/AIQualityControlDashboard";
import { useParams } from "react-router-dom";

export default function AIQualityControlPage() {
  const { projectId } = useParams();

  // For now, we'll use a default project ID if none is provided
  // In a real implementation, this would come from route params or context
  const currentProjectId = projectId || "default-project-id";

  return (
    <>
      <Helmet>
        <title>AI Quality Control | Construction Management Platform</title>
        <meta
          name="description"
          content="AI-powered quality inspection with computer vision for construction defect detection and quality assessment."
        />
      </Helmet>
      <PageLayout>
        <AIQualityControlDashboard projectId={currentProjectId} />
      </PageLayout>
    </>
  );
}
