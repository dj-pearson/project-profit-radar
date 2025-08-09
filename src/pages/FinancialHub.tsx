import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const FinancialHub: React.FC = () => {
  return (
    <DashboardLayout title="Financial Hub">
      <Helmet>
        <title>Financial Hub | BuildDesk</title>
        <meta name="description" content="Financial hub – job costing, reports, and purchasing." />
        <link rel="canonical" href="/financial-hub" />
      </Helmet>
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Financial Hub</h1>
        <p className="text-muted-foreground">Access financial dashboards, reports, and purchasing.</p>
      </main>
    </DashboardLayout>
  );
};

export default FinancialHub;
