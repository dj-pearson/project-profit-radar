import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const MyTasks: React.FC = () => {
  return (
    <DashboardLayout title="My Tasks">
      <Helmet>
        <title>My Tasks | BuildDesk</title>
        <meta name="description" content="Your personal task dashboard and assignments." />
        <link rel="canonical" href="/my-tasks" />
      </Helmet>
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">My Tasks</h1>
        <p className="text-muted-foreground">All your assignments in one place.</p>
      </main>
    </DashboardLayout>
  );
};

export default MyTasks;
