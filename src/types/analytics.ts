/**
 * Analytics Platform Types
 * Type definitions for unified search traffic analytics
 */

export type AnalyticsPlatform =
  | 'google_analytics'
  | 'google_search_console'
  | 'bing_webmaster'
  | 'yandex_webmaster';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'expired';

export type SyncStatus = 'success' | 'partial' | 'failed';

export interface AnalyticsPlatformConnection {
  id: string;
  company_id: string;
  platform_name: AnalyticsPlatform;
  platform_display_name: string;
  is_connected: boolean;
  is_active: boolean;
  connection_status: ConnectionStatus;
  oauth_provider?: string;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  token_type?: string;
  expires_at?: string;
  scope?: string;
  account_id?: string;
  account_name?: string;
  property_id?: string;
  property_name?: string;
  property_url?: string;
  auto_sync_enabled: boolean;
  sync_frequency_hours: number;
  last_synced_at?: string;
  next_sync_at?: string;
  last_sync_status?: SyncStatus;
  last_sync_error?: string;
  data_retention_days: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface GA4Property {
  id: string;
  connection_id: string;
  company_id: string;
  property_id: string;
  property_name: string;
  parent_account_id?: string;
  parent_account_name?: string;
  website_url?: string;
  industry_category?: string;
  time_zone?: string;
  currency_code: string;
  is_primary: boolean;
  data_stream_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface BingWebmasterProperty {
  id: string;
  connection_id: string;
  company_id: string;
  site_url: string;
  is_verified: boolean;
  verification_method?: string;
  is_active: boolean;
  is_primary: boolean;
  crawl_rate?: string;
  last_crawl_date?: string;
  created_at: string;
  updated_at: string;
}

export interface YandexWebmasterProperty {
  id: string;
  connection_id: string;
  company_id: string;
  host_id: string;
  host_url: string;
  host_display_name?: string;
  is_verified: boolean;
  verification_type?: string;
  verification_state?: string;
  is_active: boolean;
  is_primary: boolean;
  indexed_pages_count: number;
  last_index_date?: string;
  created_at: string;
  updated_at: string;
}

export type DateRangeType = 'daily' | 'weekly' | 'monthly';

export interface UnifiedTrafficMetrics {
  id: string;
  company_id: string;
  date: string;
  date_range_type: DateRangeType;
  platform_name: AnalyticsPlatform | 'aggregated';
  property_id?: string;

  // Traffic Metrics
  sessions: number;
  users: number;
  new_users: number;
  pageviews: number;
  bounce_rate?: number;
  avg_session_duration?: number;

  // Search Metrics
  impressions: number;
  clicks: number;
  ctr?: number;
  average_position?: number;

  // Engagement Metrics
  engagement_rate?: number;
  engaged_sessions: number;
  events_count: number;

  // Conversion Metrics
  conversions: number;
  conversion_rate?: number;
  goal_completions: number;

  // Traffic Sources
  organic_traffic: number;
  direct_traffic: number;
  referral_traffic: number;
  social_traffic: number;
  paid_traffic: number;
  email_traffic: number;

  // Device Breakdown
  desktop_sessions: number;
  mobile_sessions: number;
  tablet_sessions: number;

  // Geographic
  top_country?: string;
  top_city?: string;

  raw_data?: Record<string, any>;
  created_at: string;
}

export type SearchIntent = 'informational' | 'navigational' | 'transactional' | 'commercial';
export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface UnifiedKeywordPerformance {
  id: string;
  company_id: string;
  keyword: string;
  search_intent?: SearchIntent;
  date: string;
  platform_name: 'google' | 'bing' | 'yandex';
  impressions: number;
  clicks: number;
  ctr?: number;
  position?: number;
  top_landing_page?: string;
  landing_pages?: string[];
  device_type?: DeviceType;
  country?: string;
  position_change?: number;
  impressions_change?: number;
  clicks_change?: number;
  created_at: string;
}

export type PageType = 'homepage' | 'landing' | 'blog' | 'product' | 'category';

export interface UnifiedPagePerformance {
  id: string;
  company_id: string;
  page_url: string;
  page_title?: string;
  page_type?: PageType;
  date: string;
  platform_name: AnalyticsPlatform;

  // Analytics Metrics
  sessions: number;
  pageviews: number;
  unique_pageviews: number;
  avg_time_on_page?: number;
  bounce_rate?: number;
  exit_rate?: number;

  // Search Metrics
  impressions: number;
  clicks: number;
  ctr?: number;
  average_position?: number;

  top_keywords?: Array<{keyword: string; clicks: number; impressions: number}>;
  keywords_count: number;

  // Engagement
  scroll_depth?: number;
  engagement_rate?: number;

  // Conversions
  conversions: number;
  conversion_rate?: number;

  // Device Breakdown
  desktop_views: number;
  mobile_views: number;
  tablet_views: number;

  created_at: string;
}

export type InsightType = 'opportunity' | 'issue' | 'trend' | 'achievement';
export type InsightCategory = 'keywords' | 'traffic' | 'technical' | 'content' | 'competitors';
export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';
export type InsightStatus = 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
export type ImpactEstimate = 'low' | 'medium' | 'high';

export interface SEOInsight {
  id: string;
  company_id: string;
  insight_type: InsightType;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  impact_estimate?: ImpactEstimate;
  affected_urls?: string[];
  affected_keywords?: string[];
  metrics_data?: Record<string, any>;
  recommendations?: Array<{
    title: string;
    description: string;
    priority: number;
  }>;
  action_items?: Array<{
    task: string;
    completed: boolean;
  }>;
  status: InsightStatus;
  priority: number;
  detected_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: string;
  resolved_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficSourceAttribution {
  id: string;
  company_id: string;
  date: string;
  source: string;
  medium: string;
  campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  sessions: number;
  users: number;
  new_users: number;
  pageviews: number;
  bounce_rate?: number;
  avg_session_duration?: number;
  conversions: number;
  conversion_rate?: number;
  conversion_value?: number;
  cost?: number;
  revenue?: number;
  roas?: number; // Return on Ad Spend
  created_at: string;
}

// Dashboard Filter Types
export interface DashboardFilters {
  dateRange: {
    start: Date;
    end: Date;
    preset?: 'today' | '7days' | '30days' | '90days' | 'custom';
  };
  platforms?: AnalyticsPlatform[];
  devices?: DeviceType[];
  countries?: string[];
  compareEnabled?: boolean;
  comparePeriod?: {
    start: Date;
    end: Date;
  };
}

// Analytics API Response Types
export interface AnalyticsAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    total_count?: number;
    page?: number;
    page_size?: number;
    has_more?: boolean;
  };
}

// OAuth Flow Types
export interface OAuthInitiateResponse {
  authorization_url: string;
  state: string;
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
  platform: AnalyticsPlatform;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

// Data Sync Types
export interface SyncJobConfig {
  platform: AnalyticsPlatform;
  property_id: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  metrics_to_sync: string[];
}

export interface SyncJobResult {
  job_id: string;
  status: SyncStatus;
  records_synced: number;
  errors?: string[];
  started_at: string;
  completed_at?: string;
}

// Chart Data Types for Dashboard
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  platform?: string;
}

export interface MetricComparison {
  current: number;
  previous: number;
  change: number;
  change_percent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TopKeyword {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  change: number;
}

export interface TopPage {
  url: string;
  title?: string;
  sessions: number;
  pageviews: number;
  conversions: number;
  bounce_rate: number;
}

export interface PlatformHealth {
  platform: AnalyticsPlatform;
  is_connected: boolean;
  last_sync: string;
  sync_status: SyncStatus;
  data_freshness: 'fresh' | 'stale' | 'outdated';
  error_count: number;
}
