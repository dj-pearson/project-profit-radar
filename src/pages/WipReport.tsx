import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { WipReport } from '@/components/financial/WipReport';

/**
 * Company-wide Work-in-Progress / earned-value report page (US-224).
 */
export default function WipReportPage() {
  return (
    <AccessiblePageWrapper pageTitle="Wip Report">
    <DashboardLayout hasAccessibleWrapper>
      <div className="container mx-auto py-6 px-4">
        <WipReport />
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
}
