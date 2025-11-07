import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface SubscriptionTier {
  name: string;
  teamMembers: number;  // -1 for unlimited
  projects: number;     // -1 for unlimited
  storage: number;      // in GB, -1 for unlimited
}

export interface SubscriptionData {
  subscription_tier: string;
  billing_period: string;
  subscription_end: string;
  subscribed: boolean;
  stripe_customer_id: string;
  is_complimentary?: boolean;
  complimentary_type?: string;
  complimentary_expires_at?: string;
  complimentary_reason?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  isGracePeriod: boolean;
  isSuspended: boolean;
  isComplimentary: boolean;
  tier: string;
  trialDaysLeft: number | null;
  graceDaysLeft: number | null;
  subscriptionEndDate: string | null;
}

export interface UsageStats {
  teamMembers: number;
  projects: number;
  storage: number; // in GB
}

interface SubscriptionContextType {
  // Data
  subscriptionData: SubscriptionData | null;
  subscriptionStatus: SubscriptionStatus | null;
  usage: UsageStats;
  limits: SubscriptionTier;
  loading: boolean;

  // Methods
  checkLimit: (type: keyof SubscriptionTier, additionalCount?: number) => {
    canAdd: boolean;
    currentUsage: number;
    limit: number;
    wouldExceed?: boolean;
    isComplimentary?: boolean;
  };
  getUpgradeRequirement: (type: keyof SubscriptionTier, additionalCount?: number) => string;
  refreshSubscription: () => Promise<void>;
  refreshUsage: () => Promise<void>;

  // Helper methods
  isSubscribed: () => boolean;
  canUseFeature: (feature: string) => boolean;
  hasUnlimitedAccess: () => boolean;
}

const TIER_LIMITS: Record<string, SubscriptionTier> = {
  starter: {
    name: 'Starter',
    teamMembers: 5,
    projects: 10,
    storage: 10
  },
  professional: {
    name: 'Professional',
    teamMembers: 20,
    projects: 50,
    storage: 100
  },
  enterprise: {
    name: 'Enterprise',
    teamMembers: -1,  // unlimited
    projects: -1,     // unlimited
    storage: -1       // unlimited
  }
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [usage, setUsage] = useState<UsageStats>({
    teamMembers: 0,
    projects: 0,
    storage: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch subscription data from check-subscription edge function
  const fetchSubscriptionData = useCallback(async () => {
    if (!user) {
      setSubscriptionData(null);
      setSubscriptionStatus(null);
      return;
    }

    try {
      // Use check-subscription edge function which handles complimentary logic
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('Error checking subscription:', error);
        // Fallback to direct database query
        const { data: fallbackData } = await supabase
          .from('subscribers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fallbackData) {
          setSubscriptionData(fallbackData);
          updateSubscriptionStatus(fallbackData);
        }
        return;
      }

      if (data) {
        setSubscriptionData(data);
        updateSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  }, [user]);

  // Update subscription status based on subscription data
  const updateSubscriptionStatus = (data: SubscriptionData) => {
    if (!userProfile?.company_id) return;

    // Get company data for trial info
    supabase
      .from('companies')
      .select('trial_end_date, subscription_status')
      .eq('id', userProfile.company_id)
      .single()
      .then(({ data: companyData }) => {
        if (!companyData) return;

        const now = new Date();
        let trialDaysLeft: number | null = null;
        let graceDaysLeft: number | null = null;

        if (companyData.trial_end_date) {
          const trialEnd = new Date(companyData.trial_end_date);
          trialDaysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (companyData.subscription_status === 'grace_period' && companyData.trial_end_date) {
          const trialEnd = new Date(companyData.trial_end_date);
          const gracePeriodEnd = new Date(trialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
          graceDaysLeft = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          graceDaysLeft = Math.max(0, graceDaysLeft);
        }

        const status: SubscriptionStatus = {
          isActive: data.subscribed || false,
          isTrial: companyData.subscription_status === 'trial',
          isGracePeriod: companyData.subscription_status === 'grace_period',
          isSuspended: companyData.subscription_status === 'suspended',
          isComplimentary: data.is_complimentary || false,
          tier: data.subscription_tier || 'starter',
          trialDaysLeft,
          graceDaysLeft,
          subscriptionEndDate: data.subscription_end || null
        };

        setSubscriptionStatus(status);
      });
  };

  // Fetch current usage stats
  const fetchUsage = useCallback(async () => {
    if (!userProfile?.company_id) return;

    try {
      // Fetch team members count
      const { count: teamMembersCount } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', userProfile.company_id);

      // Fetch projects count
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', userProfile.company_id);

      // TODO: Fetch storage usage from usage_metrics table
      // For now, defaulting to 0
      const storageUsage = 0;

      setUsage({
        teamMembers: teamMembersCount || 0,
        projects: projectsCount || 0,
        storage: storageUsage
      });
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  }, [userProfile?.company_id]);

  // Get current tier limits
  const getCurrentLimits = useCallback((): SubscriptionTier => {
    const tier = subscriptionData?.subscription_tier || 'starter';
    return TIER_LIMITS[tier] || TIER_LIMITS.starter;
  }, [subscriptionData]);

  // Check if user can add more of a resource
  const checkLimit = useCallback((type: keyof SubscriptionTier, additionalCount: number = 1) => {
    // Complimentary users bypass all limits
    if (subscriptionData?.is_complimentary) {
      return {
        canAdd: true,
        currentUsage: usage[type as keyof UsageStats] || 0,
        limit: -1,
        isComplimentary: true
      };
    }

    const limits = getCurrentLimits();
    const limit = limits[type];

    // Unlimited tier
    if (limit === -1) {
      return {
        canAdd: true,
        currentUsage: usage[type as keyof UsageStats] || 0,
        limit: -1
      };
    }

    const current = usage[type as keyof UsageStats] || 0;
    const wouldExceed = (current + additionalCount) > limit;

    return {
      canAdd: !wouldExceed,
      currentUsage: current,
      limit,
      wouldExceed
    };
  }, [subscriptionData, usage, getCurrentLimits]);

  // Get the required tier to accommodate additional resources
  const getUpgradeRequirement = useCallback((type: keyof SubscriptionTier, additionalCount: number = 1) => {
    const currentTier = subscriptionData?.subscription_tier || 'starter';
    const currentUsageCount = usage[type as keyof UsageStats] || 0;
    const newTotal = currentUsageCount + additionalCount;

    // Check if professional tier would be sufficient
    if (currentTier === 'starter' && TIER_LIMITS.professional[type] >= newTotal) {
      return 'professional';
    }

    // Otherwise enterprise tier is needed
    return 'enterprise';
  }, [subscriptionData, usage]);

  // Refresh subscription data
  const refreshSubscription = useCallback(async () => {
    setLoading(true);
    await fetchSubscriptionData();
    setLoading(false);
  }, [fetchSubscriptionData]);

  // Refresh usage data
  const refreshUsage = useCallback(async () => {
    await fetchUsage();
  }, [fetchUsage]);

  // Helper: Check if user is subscribed
  const isSubscribed = useCallback(() => {
    return subscriptionData?.subscribed || false;
  }, [subscriptionData]);

  // Helper: Check if user can use a specific feature
  const canUseFeature = useCallback((feature: string) => {
    // Complimentary users can use all features
    if (subscriptionData?.is_complimentary) return true;

    // Subscribed users can use all features
    if (subscriptionData?.subscribed) return true;

    // Trial users can use all features
    if (subscriptionStatus?.isTrial) return true;

    // Grace period users have limited access
    if (subscriptionStatus?.isGracePeriod) {
      // Define features available during grace period
      const gracePeriodFeatures = ['view_projects', 'view_team', 'view_reports'];
      return gracePeriodFeatures.includes(feature);
    }

    // Suspended users cannot use features
    return false;
  }, [subscriptionData, subscriptionStatus]);

  // Helper: Check if user has unlimited access
  const hasUnlimitedAccess = useCallback(() => {
    const tier = subscriptionData?.subscription_tier || 'starter';
    return tier === 'enterprise' || subscriptionData?.is_complimentary || false;
  }, [subscriptionData]);

  // Initialize data on mount and when user changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubscriptionData(), fetchUsage()]);
      setLoading(false);
    };

    if (user && userProfile?.company_id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, userProfile?.company_id, fetchSubscriptionData, fetchUsage]);

  // Set up real-time subscription for subscription changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('subscription_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscribers',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Subscription changed:', payload);
          fetchSubscriptionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSubscriptionData]);

  const value: SubscriptionContextType = {
    subscriptionData,
    subscriptionStatus,
    usage,
    limits: getCurrentLimits(),
    loading,
    checkLimit,
    getUpgradeRequirement,
    refreshSubscription,
    refreshUsage,
    isSubscribed,
    canUseFeature,
    hasUnlimitedAccess
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
