import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import RealTimeJobCosting from '@/components/financial/RealTimeJobCosting';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const JobCosting = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get project filter from navigation state
  const projectFilter = location.state?.projectFilter;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
  }, [user, userProfile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile?.company_id) return null;

  return (
    <DashboardLayout title="Job Costing">
      <RealTimeJobCosting projectId={projectFilter} />
    </DashboardLayout>
  );
};

export default JobCosting;