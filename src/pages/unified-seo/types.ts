export interface SEOConfig {
  id?: string;
  site_name: string;
  site_description: string;
  site_keywords: string[];
  default_og_image: string;
  google_analytics_id: string;
  google_search_console_id: string;
  canonical_domain: string;
  robots_txt: string;
  sitemap_enabled: boolean;
  schema_org_enabled: boolean;
}

export interface MetaTag {
  id?: string;
  page_path: string;
  title: string;
  description: string;
  keywords: string[];
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
  no_index: boolean;
  no_follow: boolean;
}

/** One row of the seo-analytics summary, as far as the Analytics tab reads it. */
export interface SEOAnalyticsSummaryRow {
  top_queries?: { query: string; position: string; ctr: string; impressions: number; clicks: number }[];
  top_pages?: { page: string; ctr: string; impressions: number; clicks: number }[];
}
