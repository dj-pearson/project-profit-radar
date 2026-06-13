import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LeadNurturingCampaigns } from "@/components/crm/LeadNurturingCampaigns";

const CRMCampaigns = () => {
  return (
    <DashboardLayout title="Lead Nurturing Campaigns">
      <section className="space-y-6" aria-label="Lead nurturing campaigns">
        <LeadNurturingCampaigns />
      </section>
    </DashboardLayout>
  );
};

export default CRMCampaigns;
