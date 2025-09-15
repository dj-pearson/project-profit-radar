import { MobileDashboard } from '@/components/mobile/MobileDashboard';
import { MobileFieldInterface } from '@/components/mobile/MobileFieldInterface';
import { useAuth } from '@/contexts/AuthContext';

const MobileDashboardPage = () => {
  const { userProfile } = useAuth();
  
  return (
    <div className="space-y-6">
      <MobileDashboard />
      {userProfile && (
        <MobileFieldInterface 
          projectId="demo-project-id" // In real app, this would come from context or URL
          className="mx-4"
        />
      )}
    </div>
  );
};

export default MobileDashboardPage;