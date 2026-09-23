export interface AutoGenSettings {
  id?: string;
  company_id: string;
  is_enabled: boolean;
  generation_frequency: string;
  generation_time: string;
  generation_timezone: string;
  last_generation_at?: string;
  next_generation_at?: string;
  preferred_ai_provider: string;
  preferred_model: string;
  fallback_model: string;
  model_temperature: number;
  target_word_count: number;
  content_style: string;
  industry_focus: string[];
  target_keywords: string[];
  optimize_for_geographic: boolean; // Geographic/Local SEO
  target_locations: string[];
  seo_focus: string;
  geo_optimization: boolean; // Generative Engine Optimization
  perplexity_optimization: boolean;
  ai_search_optimization: boolean;
  topic_diversity_enabled: boolean;
  minimum_topic_gap_days: number;
  content_analysis_depth: string;
  auto_publish: boolean;
  publish_as_draft: boolean;
  require_review: boolean;
  notify_on_generation: boolean;
  notification_emails: string[];
  content_template?: string;
  custom_instructions?: string;
  brand_voice_guidelines?: string;
}

export interface AIModel {
  id: string;
  provider: string;
  model_name: string;
  model_display_name: string;
  model_family: string;
  description: string;
  speed_rating: number;
  quality_rating: number;
  cost_rating: number;
  recommended_for_blog: boolean;
  is_active: boolean;
}

export interface QueueItem {
  id: string;
  scheduled_for: string;
  status: string;
  suggested_topic?: string;
  ai_provider: string;
  ai_model: string;
  generated_blog_id?: string;
  error_message?: string;
  retry_count: number;
}
