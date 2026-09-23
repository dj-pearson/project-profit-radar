import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { DemoCalendar } from '@/components/admin/DemoCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const DemoManagement = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is admin
  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.role !== 'root_admin' && userProfile.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [userProfile, navigate, toast]);

  return (
    <AccessiblePageWrapper pageTitle="Demo Management">
    <DashboardLayout hasAccessibleWrapper title="Demo Management">
      <DemoCalendar />
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default DemoManagement;
