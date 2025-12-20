import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HubPageLayout } from "@/components/hub/HubPageLayout";
import { hierarchicalNavigation } from "@/components/navigation/HierarchicalNavigationConfig";
import { Users } from "lucide-react";

const PeopleHub: React.FC = () => {
  // Get the people area from hierarchical navigation
  const peopleArea = hierarchicalNavigation.find(area => area.id === "people");
  const sections = peopleArea?.sections || [];

  return (
    <DashboardLayout title="People Hub">
      <Helmet>
        <title>People Hub | BuildDesk</title>
        <meta name="description" content="People hub – team, CRM, and communications." />
        <link rel="canonical" href="/people-hub" />
      </Helmet>
      <HubPageLayout
        title="People Hub"
        description="Manage your team, customers, and communication all in one place."
        sections={sections}
        icon={Users}
      />
    </DashboardLayout>
  );
};

export default PeopleHub;
