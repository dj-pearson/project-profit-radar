import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HubPageLayout } from "@/components/hub/HubPageLayout";
import { hierarchicalNavigation } from "@/components/navigation/HierarchicalNavigationConfig";
import { DollarSign } from "lucide-react";

const FinancialHub: React.FC = () => {
  // Get the financial area from hierarchical navigation
  const financialArea = hierarchicalNavigation.find(area => area.id === "financial");
  const sections = financialArea?.sections || [];

  return (
    <DashboardLayout title="Financial Hub">
      <Helmet>
        <title>Financial Hub | BuildDesk</title>
        <meta name="description" content="Financial hub – job costing, reports, and purchasing." />
        <link rel="canonical" href="/financial-hub" />
      </Helmet>
      <HubPageLayout
        title="Financial Hub"
        description="Manage financial operations, job costing, purchasing, and financial reporting."
        sections={sections}
        icon={DollarSign}
      />
    </DashboardLayout>
  );
};

export default FinancialHub;
