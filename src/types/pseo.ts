/**
 * pSEO (Programmatic SEO) Type Definitions
 * Based on BuildDesk pSEO Full System Specification v1.0
 */

// =============================================
// Dimension Types
// =============================================

export type PageType =
  | 'contractor_pain'
  | 'contractor_geo'
  | 'pain_size'
  | 'pain_geo'
  | 'comparison'
  | 'contractor_size'
  | 'feature_contractor';

export type GenerationStatus =
  | 'pending'
  | 'generated'
  | 'review_needed'
  | 'failed'
  | 'published'
  | 'stale';

export type QueueStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'insufficient_data';

export type Tier = 1 | 2 | 3;

export type SearchVolume = 'high' | 'medium' | 'long-tail';

export type GeoLevel = 'state' | 'metro';

// =============================================
// Dimension Context Objects
// =============================================

export interface ContractorTypeContext {
  id: string;
  display_name: string;
  typical_project_count: string;
  typical_crew_size: string;
  primary_billing_method: string;
  biggest_financial_pain: string;
  key_software_needs: string[];
  competitor_context: string;
  avg_project_value: string;
}

export interface PainPointContext {
  id: string;
  display_name: string;
  core_pain: string;
  ideal_outcome: string;
  key_metric: string;
  user_persona: string;
  search_intent_stage: string;
  competing_solutions: string[];
  builddesk_advantage: string;
}

export interface BusinessSizeContext {
  id: string;
  revenue_range: string;
  employee_range: string;
  software_maturity: string;
  price_sensitivity: string;
  decision_maker: string;
  primary_concern: string;
  builddesk_fit: string;
}

export interface GeographyContext {
  id: string;
  display_name: string;
  market_size: string;
  growth_trend: string;
  regulatory_notes: string;
  prevailing_wage: string;
  lien_law: string;
  weather_risk: string;
  peak_season: string;
}

export interface CompetitorProfile {
  id: string;
  display_name: string;
  pricing: string;
  target_market: string;
  strengths: string[];
  weaknesses: string[];
  best_for: string;
}

// =============================================
// Database Row Types
// =============================================

export interface PSEOContractorType {
  id: string;
  display_name: string;
  url_slug: string;
  context_object: ContractorTypeContext;
  is_active: boolean;
  created_at: string;
}

export interface PSEOPainPoint {
  id: string;
  display_name: string;
  url_slug: string;
  context_object: PainPointContext;
  is_active: boolean;
  created_at: string;
}

export interface PSEOGeography {
  id: string;
  display_name: string;
  url_slug: string;
  geo_level: GeoLevel;
  context_object: GeographyContext;
  is_active: boolean;
  created_at: string;
}

export interface PSEOBusinessSize {
  id: string;
  display_name: string;
  url_slug: string;
  context_object: BusinessSizeContext;
  is_active: boolean;
  created_at: string;
}

export interface PSEOCompetitor {
  id: string;
  display_name: string;
  url_slug: string;
  competitor_profile: CompetitorProfile;
  pricing_verified_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// Page Schema Types
// =============================================

export interface PSEOPage {
  id: string;
  page_type: PageType;
  combination_key: string;
  dimension_1: string;
  dimension_2: string;
  dimension_3: string | null;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  page_schema: Record<string, unknown>;
  schema_version: string;
  is_published: boolean;
  generation_status: GenerationStatus;
  qc_failures: string[] | null;
  freshness_days: number;
  next_refresh_at: string;
  generation_model: string;
  generation_prompt_version: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  view_count: number;
  conversion_count: number;
}

export interface PSEOGenerationQueueItem {
  id: string;
  page_type: PageType;
  combination_key: string;
  dimension_1: string;
  dimension_2: string;
  dimension_3: string | null;
  tier: Tier;
  estimated_volume: SearchVolume;
  status: QueueStatus;
  failure_reason: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

// =============================================
// Page Content Schemas (JSON stored in page_schema)
// =============================================

export interface ContractorPainPageSchema {
  meta: {
    page_type: 'contractor_pain';
    generated_at: string;
    schema_version: string;
    combination: {
      contractor_type: string;
      pain_point: string;
    };
    freshness_days: number;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    canonical_url: string;
    schema_type: string;
    og_title: string;
  };
  hero: {
    headline: string;
    subheadline: string;
    intro: string;
    proof_point: string;
    cta_primary: string;
    cta_secondary: string;
  };
  pain_section: {
    section_title: string;
    pain_points: Array<{
      title: string;
      description: string;
      consequence: string;
    }>;
  };
  solution_section: {
    section_title: string;
    features: Array<{
      name: string;
      description: string;
      contractor_specific_benefit: string;
    }>;
  };
  differentiation: {
    unlimited_users_callout: {
      headline: string;
      description: string;
    };
    vs_spreadsheets?: {
      headline: string;
      comparison_points: string[];
    };
    vs_competitor?: {
      competitor_name: string;
      headline: string;
      key_differences: string[];
    };
  };
  how_it_works: {
    section_title: string;
    steps: Array<{
      step_number: number;
      title: string;
      description: string;
    }>;
  };
  pricing: {
    headline: string;
    starter_price: string;
    starter_description: string;
    professional_description: string;
    unlimited_users_emphasis: string;
  };
  faq: Array<{
    question: string;
    answer: string;
  }>;
  related_pages: Array<{
    title: string;
    url: string;
    relationship: string;
    page_type: string;
  }>;
}

export interface ComparisonPageSchema {
  meta: {
    page_type: 'comparison';
    generated_at: string;
    schema_version: string;
    combination: {
      competitor_id: string;
      competitor_name: string;
    };
    freshness_days: number;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    canonical_url: string;
    schema_type: string;
    og_title: string;
  };
  hero: {
    headline: string;
    subheadline: string;
    intro: string;
    fairness_disclaimer: string;
  };
  comparison_table: {
    features: Array<{
      feature_name: string;
      builddesk_value: string;
      competitor_value: string;
      winner: 'builddesk' | 'competitor' | 'tie';
      why_it_matters: string;
    }>;
    pricing: {
      builddesk_price: string;
      competitor_price: string;
      pricing_note: string;
    };
  };
  when_to_choose_builddesk: {
    section_title: string;
    scenarios: string[];
  };
  when_to_choose_competitor: {
    section_title: string;
    scenarios: string[];
  };
  switching_guide?: {
    headline: string;
    steps: string[];
    migration_support: string;
  };
  faq: Array<{
    question: string;
    answer: string;
  }>;
  related_pages: Array<{
    title: string;
    url: string;
    relationship: string;
    page_type: string;
  }>;
}

// =============================================
// Admin UI Types
// =============================================

export interface PSEODashboardStats {
  totalPages: number;
  publishedPages: number;
  pendingReview: number;
  failedPages: number;
  stalePages: number;
  queuePending: number;
  queueInProgress: number;
  totalViews: number;
  totalConversions: number;
  pagesByType: Record<PageType, number>;
}

export interface PSEOQCResult {
  check: string;
  passed: boolean;
  message: string;
}

export type DimensionType =
  | 'contractor_types'
  | 'pain_points'
  | 'geographies'
  | 'business_sizes'
  | 'competitors';

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  contractor_pain: 'Contractor + Pain Point',
  contractor_geo: 'Contractor + Geography',
  pain_size: 'Pain Point + Size',
  pain_geo: 'Pain Point + Geography',
  comparison: 'Competitor Comparison',
  contractor_size: 'Contractor + Size',
  feature_contractor: 'Feature + Contractor',
};

export const GENERATION_STATUS_LABELS: Record<GenerationStatus, string> = {
  pending: 'Pending',
  generated: 'Generated',
  review_needed: 'Needs Review',
  failed: 'Failed',
  published: 'Published',
  stale: 'Stale',
};

export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  insufficient_data: 'Insufficient Data',
};
