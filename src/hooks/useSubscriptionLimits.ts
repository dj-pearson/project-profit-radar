import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionLimits {
  teamMembers: number;
  projects: number;
  storage: number; // in GB
}

export interface SubscriptionData {
  subscription_tier: string;
  subscribed: boolean;
  is_complimentary?: boolean;
}

const TIER_LIMITS: Record<string, SubscriptionLimits> = {
  starter: {
    teamMembers: 5,
    projects: 10,
    storage: 10
  },
  professional: {
    teamMembers: 20,
    projects: 50,
    storage: 100
  },
  enterprise: {
    teamMembers: -1, // unlimited
    projects: -1, // unlimited
    storage: -1 // unlimited
  }
};

export const useSubscriptionLimits = () => {
  const { user, userProfile } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [currentUsage, setCurrentUsage] = useState({
    teamMembers: 0,
    projects: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('subscription_tier, subscribed, is_complimentary')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSubscriptionData(data || { subscription_tier: 'starter', subscribed: false });
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      // Default to starter tier if no subscription found
      setSubscriptionData({ subscription_tier: 'starter', subscribed: false });
    }
  };

  const fetchCurrentUsage = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Fetch team members count
      const { count: teamMembersCount } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('company_id', userProfile.company_id);

      // Fetch projects count
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('company_id', userProfile.company_id);

      setCurrentUsage({
        teamMembers: teamMembersCount || 0,
        projects: projectsCount || 0
      });
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubscriptionData(), fetchCurrentUsage()]);
      setLoading(false);
    };

    if (user && userProfile?.company_id) {
      loadData();
    }
  }, [user, userProfile?.company_id]);

  const getCurrentLimits = (): SubscriptionLimits => {
    const tier = subscriptionData?.subscription_tier || 'starter';
    return TIER_LIMITS[tier] || TIER_LIMITS.starter;
  };

  const checkLimit = (type: keyof SubscriptionLimits, additionalCount: number = 1) => {
    const limits = getCurrentLimits();
    const limit = limits[type];
    
    // Unlimited tier
    if (limit === -1) {
      return { canAdd: true, currentUsage: currentUsage[type as keyof typeof currentUsage] || 0, limit: -1 };
    }

    const current = currentUsage[type as keyof typeof currentUsage] || 0;
    const wouldExceed = (current + additionalCount) > limit;

    return {
      canAdd: !wouldExceed,
      currentUsage: current,
      limit,
      wouldExceed
    };
  };

  const getUpgradeRequirement = (type: keyof SubscriptionLimits, additionalCount: number = 1) => {
    const currentTier = subscriptionData?.subscription_tier || 'starter';
    const currentUsageCount = currentUsage[type as keyof typeof currentUsage] || 0;
    const newTotal = currentUsageCount + additionalCount;

    // Check if professional tier would be sufficient
    if (currentTier === 'starter' && TIER_LIMITS.professional[type] >= newTotal) {
      return 'professional';
    }

    // Otherwise enterprise tier is needed
    return 'enterprise';
  };

  const refreshData = async () => {
    await Promise.all([fetchSubscriptionData(), fetchCurrentUsage()]);
  };

  return {
    subscriptionData,
    currentUsage,
    limits: getCurrentLimits(),
    checkLimit,
    getUpgradeRequirement,
    loading,
    refreshData
  };
};
