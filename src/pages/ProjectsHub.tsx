import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const ProjectsHub: React.FC = () => {
  return (
    <DashboardLayout title="Projects Hub">
      <Helmet>
        <title>Projects Hub | BuildDesk</title>
        <meta name="description" content="Projects hub – manage projects, resources, and communication in one place." />
        <link rel="canonical" href="/projects-hub" />
      </Helmet>
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Projects Hub</h1>
        <p className="text-muted-foreground">Central place for all project-related tools and views.</p>
      </main>
    </DashboardLayout>
  );
};

export default ProjectsHub;
