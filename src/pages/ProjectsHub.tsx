import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HubPageLayout } from "@/components/hub/HubPageLayout";
import { hierarchicalNavigation } from "@/components/navigation/HierarchicalNavigationConfig";
import { Building2 } from "lucide-react";

const ProjectsHub: React.FC = () => {
  // Get the projects area from hierarchical navigation
  const projectsArea = hierarchicalNavigation.find(area => area.id === "projects");
  const sections = projectsArea?.sections || [];

  return (
    <DashboardLayout title="Projects Hub">
      <Helmet>
        <title>Projects Hub | BuildDesk</title>
        <meta name="description" content="Projects hub – manage projects, resources, and communication in one place." />
        <link rel="canonical" href="/projects-hub" />
      </Helmet>
      <HubPageLayout
        title="Projects Hub"
        description="Manage all aspects of your construction projects from planning to completion."
        sections={sections}
        icon={Building2}
      />
    </DashboardLayout>
  );
};

export default ProjectsHub;
