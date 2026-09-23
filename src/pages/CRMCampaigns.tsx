import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { LeadNurturingCampaigns } from "@/components/crm/LeadNurturingCampaigns";

const CRMCampaigns = () => {
  return (
    <AccessiblePageWrapper pageTitle="Lead Nurturing Campaigns">
    <DashboardLayout hasAccessibleWrapper title="Lead Nurturing Campaigns">
      <section className="space-y-6" aria-label="Lead nurturing campaigns">
        <LeadNurturingCampaigns />
      </section>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default CRMCampaigns;
