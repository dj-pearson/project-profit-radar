import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WipReport } from '@/components/financial/WipReport';

/**
 * Company-wide Work-in-Progress / earned-value report page (US-224).
 */
export default function WipReportPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4">
        <WipReport />
      </div>
    </DashboardLayout>
  );
}
