import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { logger } from '@/lib/logger';

const Setup = () => {
  const { user, userProfile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();

  // Clear OAuth hash params to prevent redirect issues
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token=') || hash.includes('refresh_token='))) {
      logger.debug('Clearing OAuth callback hash from URL (Setup)');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }

    // If user already has a company, redirect to dashboard
    if (userProfile?.company_id) {
      navigate('/dashboard');
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

  if (!user) return null;

  const handleOnboardingComplete = async () => {
    await refreshProfile();
    navigate('/dashboard');
  };

  return (
    <OnboardingWizard onComplete={handleOnboardingComplete} />
  );
};

export default Setup;
