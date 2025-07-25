export interface SocialAutomationSettings {
  id?: string;
  company_id: string;
  is_active: boolean;
  auto_post_on_publish: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  ai_content_generation: boolean;
  platforms_enabled: string[];
  posting_schedule: Record<string, unknown>;
  content_templates: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface SocialAutomationLog {
  id: string;
  company_id: string;
  blog_post_id: string;
  trigger_type: "manual" | "auto_publish" | "scheduled";
  platforms_processed: string[];
  posts_created: number;
  webhook_sent: boolean;
  webhook_response: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  company_id: string;
  title?: string;
  content: string;
  content_type: "text" | "image" | "video" | "carousel" | "article";
  media_urls: string[];
  platforms: Array<{ platform: string }>;
  scheduled_for?: string;
  published_at?: string;
  status: "draft" | "scheduled" | "published" | "failed" | "cancelled";
  blog_post_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface PlatformContent {
  platform: string;
  content: string;
  hashtags?: string[];
  media_urls?: string[];
  optimal_length: number;
}

export interface WebhookPayload {
  timestamp: string;
  event: string;
  data: {
    blog_post: {
      id: string;
      title: string;
      body: string;
      excerpt: string;
      featured_image_url?: string;
      status: string;
    };
    social_posts: PlatformContent[];
    company_id: string;
    trigger_type: string;
  };
}

export interface AutomationTriggerParams {
  blogPostId: string;
  triggerType?: "manual" | "auto_publish" | "scheduled";
  customWebhookUrl?: string;
}
