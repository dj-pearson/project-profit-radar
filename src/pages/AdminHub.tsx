import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const AdminHub: React.FC = () => {
  return (
    <DashboardLayout title="Admin Hub">
      <Helmet>
        <title>Admin Hub | BuildDesk</title>
        <meta name="description" content="Administration hub – company, billing, and platform settings." />
        <link rel="canonical" href="/admin-hub" />
      </Helmet>
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Admin Hub</h1>
        <p className="text-muted-foreground">System administration and platform management.</p>
      </main>
    </DashboardLayout>
  );
};

export default AdminHub;
