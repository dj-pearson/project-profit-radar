import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const PeopleHub: React.FC = () => {
  return (
    <DashboardLayout title="People Hub">
      <Helmet>
        <title>People Hub | BuildDesk</title>
        <meta name="description" content="People hub – team, CRM, and communications." />
        <link rel="canonical" href="/people-hub" />
      </Helmet>
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">People Hub</h1>
        <p className="text-muted-foreground">Manage your team, customers, and communications.</p>
      </main>
    </DashboardLayout>
  );
};

export default PeopleHub;
