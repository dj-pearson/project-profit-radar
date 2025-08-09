import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const OperationsHub: React.FC = () => {
  return (
    <DashboardLayout title="Operations Hub">
      <Helmet>
        <title>Operations Hub | BuildDesk</title>
        <meta name="description" content="Operations hub – safety, compliance, permits, and more." />
        <link rel="canonical" href="/operations-hub" />
      </Helmet>
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Operations Hub</h1>
        <p className="text-muted-foreground">Daily operations, safety, and compliance tools.</p>
      </main>
    </DashboardLayout>
  );
};

export default OperationsHub;
