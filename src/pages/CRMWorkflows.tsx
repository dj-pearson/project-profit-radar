import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { LeadQualificationWorkflows } from "@/components/crm/LeadQualificationWorkflows";

const CRMWorkflows = () => {
  return (
    <AccessiblePageWrapper pageTitle="Lead Qualification Workflows">
    <DashboardLayout hasAccessibleWrapper title="Lead Qualification Workflows">
      <section className="space-y-6" aria-label="Lead qualification workflows">
        <LeadQualificationWorkflows />
      </section>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default CRMWorkflows;
