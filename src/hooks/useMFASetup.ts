import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSecurity } from '@/hooks/useSecurity';
import { supabase } from '@/integrations/supabase/client';

interface MFASetupState {
  shouldPromptMFA: boolean;
  isFirstLogin: boolean;
  companyRequiresMFA: boolean;
  userHasMFA: boolean;
}

export const useMFASetup = () => {
  const { user, userProfile } = useAuth();
  const { userSecurity } = useSecurity();
  const [mfaState, setMFAState] = useState<MFASetupState>({
    shouldPromptMFA: false,
    isFirstLogin: false,
    companyRequiresMFA: false,
    userHasMFA: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMFASetupNeeded = async () => {
      if (!user || !userProfile) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Check if user has MFA enabled
        const userHasMFA = userSecurity?.two_factor_enabled || false;

        // Check company MFA policy
        let companyRequiresMFA = false;
        if (userProfile.company_id) {
          const { data: companySettings } = await supabase
            .from('company_admin_settings')
            .select('security_policies')
            .eq('company_id', userProfile.company_id)
            .single();

          if (companySettings?.security_policies && typeof companySettings.security_policies === 'object') {
            const securityPolicies = companySettings.security_policies as { require_2fa?: boolean };
            companyRequiresMFA = securityPolicies.require_2fa || false;
          }
        }

        // Check if this is a first login by looking at login history
        let isFirstLogin = false;
        const { data: securityLogs } = await supabase
          .from('security_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_type', 'login_success')
          .limit(2);

        // If there are fewer than 2 successful logins, consider this a first login
        isFirstLogin = (securityLogs?.length || 0) <= 1;

        // Check if we have dismissed the MFA setup in localStorage
        const dismissedKey = `mfa_setup_dismissed_${user.id}`;
        const hasDismissed = localStorage.getItem(dismissedKey) === 'true';

        // Determine if we should prompt for MFA setup
        const shouldPromptMFA = 
          !userHasMFA && // User doesn't have MFA enabled
          (companyRequiresMFA || // Company requires it
            (isFirstLogin && !hasDismissed)); // First login and not dismissed

        setMFAState({
          shouldPromptMFA,
          isFirstLogin,
          companyRequiresMFA,
          userHasMFA,
        });

      } catch (error) {
        console.error('Error checking MFA setup status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkMFASetupNeeded();
  }, [user, userProfile, userSecurity?.two_factor_enabled]);

  const dismissMFASetup = () => {
    if (user && !mfaState.companyRequiresMFA) {
      const dismissedKey = `mfa_setup_dismissed_${user.id}`;
      localStorage.setItem(dismissedKey, 'true');
      setMFAState(prev => ({ ...prev, shouldPromptMFA: false }));
    }
  };

  const completeMFASetup = () => {
    setMFAState(prev => ({ 
      ...prev, 
      shouldPromptMFA: false, 
      userHasMFA: true 
    }));
  };

  return {
    ...mfaState,
    isLoading,
    dismissMFASetup,
    completeMFASetup,
  };
};