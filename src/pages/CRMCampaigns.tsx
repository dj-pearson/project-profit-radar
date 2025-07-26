import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LeadNurturingCampaigns } from "@/components/crm/LeadNurturingCampaigns";

const CRMCampaigns = () => {
  return (
    <DashboardLayout title="Lead Nurturing Campaigns">
      <div className="space-y-6">
        <LeadNurturingCampaigns />
      </div>
    </DashboardLayout>
  );
};

export default CRMCampaigns;
