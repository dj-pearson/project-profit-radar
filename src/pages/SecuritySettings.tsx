import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';
import { MobilePageWrapper } from '@/utils/mobileHelpers';

const SecuritySettings = () => {
  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ADMINS}>
      <AccessiblePageWrapper pageTitle="Security Settings">
      <DashboardLayout hasAccessibleWrapper title="Security Settings">
      <MobilePageWrapper title="Security & Privacy" className="px-4 sm:px-6">
        <div className="mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your account security settings and monitor suspicious activity
          </p>
        </div>
        
        <SecurityDashboard />
      </MobilePageWrapper>
    </DashboardLayout>
    </AccessiblePageWrapper>
    </RoleGuard>
  );
};

export default SecuritySettings;