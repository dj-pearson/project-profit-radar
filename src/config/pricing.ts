// Centralized pricing configuration for BuildDesk
// This is the single source of truth for all pricing-related data

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';
export type BillingPeriod = 'monthly' | 'annual';

export interface PricingPlan {
  id: SubscriptionTier;
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number; // Price when billed monthly
  annualPrice: number; // Total annual price
  annualMonthlyEquivalent: number; // Monthly equivalent when billed annually (annualPrice / 12)
  description: string;
  shortDescription?: string;
  features: string[];
  limitations?: string[];
  limits?: string;
  isPopular?: boolean;
  teamSize?: {
    min: number;
    max: number | null; // null means unlimited
  };
  projectLimit?: {
    min: number;
    max: number | null; // null means unlimited
  };
}

export const ANNUAL_DISCOUNT_PERCENT = 20;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    tier: 'starter',
    name: 'Starter',
    monthlyPrice: 149,
    annualPrice: 1490, // $149 * 10 months (2 months free)
    annualMonthlyEquivalent: 119, // $1490 / 12 months
    description: 'Perfect for small teams',
    shortDescription: 'Perfect for small teams (1-5 users)',
    features: [
      'Up to 5 team members',
      'Up to 10 active projects',
      'Basic job costing',
      'Mobile time tracking',
      'QuickBooks sync',
      'Email support',
      'Basic reporting',
      'Mobile app'
    ],
    limitations: ['Limited integrations', 'Basic compliance tools'],
    limits: '5 members • 10 projects',
    teamSize: {
      min: 1,
      max: 5
    },
    projectLimit: {
      min: 1,
      max: 10
    }
  },
  {
    id: 'professional',
    tier: 'professional',
    name: 'Professional',
    monthlyPrice: 299,
    annualPrice: 2990, // $299 * 10 months (2 months free)
    annualMonthlyEquivalent: 239, // $2990 / 12 months
    description: 'Most popular choice',
    shortDescription: 'Most popular for growing contractors (5-15 users)',
    features: [
      'Up to 20 team members',
      'Up to 50 projects',
      'Unlimited projects',
      'Advanced job costing',
      'Full mobile suite',
      'All integrations',
      'OSHA compliance tools',
      'Client portal',
      'Advanced reporting',
      'Time tracking',
      'QuickBooks integration',
      'Phone support',
      'Priority support',
      'Custom workflows'
    ],
    limits: '20 members • 50 projects',
    isPopular: true,
    teamSize: {
      min: 6,
      max: 20
    },
    projectLimit: {
      min: 11,
      max: 50
    }
  },
  {
    id: 'enterprise',
    tier: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 599,
    annualPrice: 5990, // $599 * 10 months (2 months free)
    annualMonthlyEquivalent: 479, // $5990 / 12 months
    description: 'For large operations',
    shortDescription: 'For established contractors (15+ users)',
    features: [
      'Unlimited team members',
      'Unlimited projects',
      'Everything in Professional',
      'Custom domain support',
      'White-label branding',
      'Custom integrations',
      'Advanced automation',
      'White-label client portal',
      'Dedicated success manager',
      'Dedicated support',
      '24/7 priority support',
      'Advanced analytics',
      'Multi-company management'
    ],
    limits: 'Unlimited',
    teamSize: {
      min: 21,
      max: null
    },
    projectLimit: {
      min: 51,
      max: null
    }
  }
];

// Utility functions for pricing calculations

/**
 * Get a pricing plan by its tier
 */
export const getPlan = (tier: SubscriptionTier): PricingPlan | undefined => {
  return PRICING_PLANS.find(plan => plan.tier === tier);
};

/**
 * Get the price for a plan based on billing period
 */
export const getPlanPrice = (tier: SubscriptionTier, billingPeriod: BillingPeriod): number => {
  const plan = getPlan(tier);
  if (!plan) return 0;

  return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
};

/**
 * Get the monthly equivalent price (useful for displaying "per month" on annual plans)
 */
export const getMonthlyEquivalentPrice = (tier: SubscriptionTier, billingPeriod: BillingPeriod): number => {
  const plan = getPlan(tier);
  if (!plan) return 0;

  return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualMonthlyEquivalent;
};

/**
 * Calculate annual savings amount
 */
export const getAnnualSavings = (tier: SubscriptionTier): number => {
  const plan = getPlan(tier);
  if (!plan) return 0;

  return (plan.monthlyPrice * 12) - plan.annualPrice;
};

/**
 * Recommend a plan based on team size and project count
 */
export const recommendPlan = (teamSize: number, projectCount: number): SubscriptionTier => {
  // Starter: 1-5 team members, <10 projects
  if (teamSize <= 5 && projectCount <= 10) {
    return 'starter';
  }
  // Professional: 6-20 team members, 11-50 projects
  else if (teamSize <= 20 && projectCount <= 50) {
    return 'professional';
  }
  // Enterprise: 20+ team members or 50+ projects
  else {
    return 'enterprise';
  }
};

/**
 * Get recommendation message for a tier
 */
export const getRecommendationMessage = (tier: SubscriptionTier): string => {
  const messages: Record<SubscriptionTier, string> = {
    starter: "Perfect for small teams just getting started",
    professional: "Great choice! This plan fits most construction businesses",
    enterprise: "Ideal for larger operations with complex needs"
  };
  return messages[tier];
};

/**
 * Format price for display
 */
export const formatPrice = (price: number): string => {
  return `$${price.toLocaleString()}`;
};

/**
 * Check if a plan supports a given team size
 */
export const planSupportsTeamSize = (tier: SubscriptionTier, teamSize: number): boolean => {
  const plan = getPlan(tier);
  if (!plan || !plan.teamSize) return false;

  if (plan.teamSize.max === null) {
    return teamSize >= plan.teamSize.min;
  }

  return teamSize >= plan.teamSize.min && teamSize <= plan.teamSize.max;
};

/**
 * Check if a plan supports a given project count
 */
export const planSupportsProjectCount = (tier: SubscriptionTier, projectCount: number): boolean => {
  const plan = getPlan(tier);
  if (!plan || !plan.projectLimit) return false;

  if (plan.projectLimit.max === null) {
    return projectCount >= plan.projectLimit.min;
  }

  return projectCount >= plan.projectLimit.min && projectCount <= plan.projectLimit.max;
};
