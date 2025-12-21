import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HubPageLayout } from "@/components/hub/HubPageLayout";
import { hierarchicalNavigation } from "@/components/navigation/HierarchicalNavigationConfig";
import { Clipboard } from "lucide-react";

const OperationsHub: React.FC = () => {
  // Get the operations area from hierarchical navigation
  const operationsArea = hierarchicalNavigation.find(area => area.id === "operations");
  const sections = operationsArea?.sections || [];

  return (
    <DashboardLayout title="Operations Hub">
      <Helmet>
        <title>Operations Hub | BuildDesk</title>
        <meta name="description" content="Operations hub – safety, compliance, permits, and more." />
        <link rel="canonical" href="/operations-hub" />
      </Helmet>
      <HubPageLayout
        title="Operations Hub"
        description="Manage daily operations, safety, compliance, permits, and specialized services."
        sections={sections}
        icon={Clipboard}
      />
    </DashboardLayout>
  );
};

export default OperationsHub;
