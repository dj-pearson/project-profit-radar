import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAffiliateTracking = () => {
  useEffect(() => {
    // Check for referral code in URL on mount
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    
    if (referralCode) {
      // Store referral code in localStorage for later use
      localStorage.setItem('referral_code', referralCode);
      
      // Clean up URL without triggering navigation
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  const trackReferralSignup = async (userEmail: string, companyId: string, subscriptionTier?: string, subscriptionDurationMonths?: number) => {
    const referralCode = localStorage.getItem('referral_code');
    
    if (!referralCode) return;

    try {
      // Track the referral click first
      await supabase.functions.invoke('track-referral', {
        body: {
          affiliate_code: referralCode,
          referee_email: userEmail
        }
      });

      // Process the signup/subscription
      await supabase.functions.invoke('process-referral-signup', {
        body: {
          referee_email: userEmail,
          referee_company_id: companyId,
          subscription_tier: subscriptionTier,
          subscription_duration_months: subscriptionDurationMonths
        }
      });

      // Clear the referral code after processing
      localStorage.removeItem('referral_code');
      
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  };

  return { trackReferralSignup };
};