import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LeadQualificationWorkflows } from "@/components/crm/LeadQualificationWorkflows";

const CRMWorkflows = () => {
  return (
    <DashboardLayout title="Lead Qualification Workflows">
      <div className="space-y-6">
        <LeadQualificationWorkflows />
      </div>
    </DashboardLayout>
  );
};

export default CRMWorkflows;
