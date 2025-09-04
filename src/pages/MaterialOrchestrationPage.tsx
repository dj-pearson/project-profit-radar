import React from "react";
import { Helmet } from "react-helmet-async";
import { PageLayout } from "@/components/layout/PageLayout";
import MaterialOrchestrationDashboard from "@/components/materials/MaterialOrchestrationDashboard";
import { useAuth } from "@/contexts/AuthContext";

export default function MaterialOrchestrationPage() {
  const { userProfile } = useAuth();

  return (
    <>
      <Helmet>
        <title>Material Orchestration | Construction Management Platform</title>
        <meta
          name="description"
          content="Smart material planning, shortage detection, and inventory optimization for construction projects."
        />
      </Helmet>
      <PageLayout>
        <MaterialOrchestrationDashboard companyId={userProfile?.company_id} />
      </PageLayout>
    </>
  );
}
