import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HubPageLayout } from "@/components/hub/HubPageLayout";
import { hierarchicalNavigation } from "@/components/navigation/HierarchicalNavigationConfig";
import { Settings } from "lucide-react";

const AdminHub: React.FC = () => {
  // Get the admin area from hierarchical navigation
  const adminArea = hierarchicalNavigation.find(area => area.id === "admin");
  const sections = adminArea?.sections || [];

  return (
    <DashboardLayout title="Admin Hub">
      <Helmet>
        <title>Admin Hub | BuildDesk</title>
        <meta name="description" content="Administration hub – company, billing, and platform settings." />
        <link rel="canonical" href="/admin-hub" />
      </Helmet>
      <HubPageLayout
        title="Admin Hub"
        description="System administration, company management, billing, and platform configuration."
        sections={sections}
        icon={Settings}
      />
    </DashboardLayout>
  );
};

export default AdminHub;
