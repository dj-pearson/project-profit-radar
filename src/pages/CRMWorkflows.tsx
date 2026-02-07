import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LeadQualificationWorkflows } from "@/components/crm/LeadQualificationWorkflows";

const CRMWorkflows = () => {
  return (
    <DashboardLayout title="Lead Qualification Workflows">
      <section className="space-y-6" aria-label="Lead qualification workflows">
        <LeadQualificationWorkflows />
      </section>
    </DashboardLayout>
  );
};

export default CRMWorkflows;
