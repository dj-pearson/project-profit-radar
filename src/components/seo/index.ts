/**
 * SEO Components Index
 *
 * Centralized exports for all SEO-related components.
 * Import from '@/components/seo' for clean imports.
 *
 * Usage:
 * import { PageSEO, UnifiedSEOSystem } from '@/components/seo';
 */

// Core SEO Components
export { PageSEO, createOrganizationSchema, createSoftwareApplicationSchema, createFAQSchema, createBreadcrumbSchema, createHowToSchema, createProductSchema, createArticleSchema, createWebPageSchema, createWebSiteSchema, createComparisonSchema } from './PageSEO';
export type { PageSEOProps } from './PageSEO';

export { UnifiedSEOSystem } from './UnifiedSEOSystem';
export type { UnifiedSEOProps } from './UnifiedSEOSystem';

// FAQ Components
export { GEOOptimizedFAQ } from './GEOOptimizedFAQ';

// Schema Components
export { SaaSProductSchema } from './SaaSProductSchema';
// ./EnhancedSchemaMarkup ships the individual schema components; the combined
// `EnhancedSchemaMarkup` component lives at '@/components/EnhancedSchemaMarkup'.
export { FAQSchema, OrganizationSchema, SoftwareSchema, ArticleSchema } from './EnhancedSchemaMarkup';
export { AggregateRatingSchema } from './AggregateRatingSchema';
export { HowToSchema } from './HowToSchema';

// SEO Utility Components
export { QuickAnswerSnippet, LastUpdated } from './QuickAnswerSnippet';
export { default as SEOCompatibilityLayer, EnhancedSEOMetaTags } from './SEOCompatibilityLayer';

// The admin SEO dashboards were exported from here and mounted nowhere. They
// are gone (US-314): /admin/seo renders components/admin/SEOManager, and
// /admin/seo-management renders pages/UnifiedSEODashboard, which is what the
// /admin/seo-analytics and /seo-management redirects point at.
//
// ProgrammaticSEO, InternalLinking, InteractiveFAQ, GEOContentWrapper,
// DynamicSEOOptimizer and the LocalSEO/VideoSEO/SiteSearch schema components
// went the same way in US-296: exported from here, rendered nowhere.

// Re-export configuration
export {
  getSEOConfig,
  getRelatedPages,
  getPagesByCategory,
  getSitemapPages,
  getBreadcrumbs,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  COMPANY_INFO,
  SOFTWARE_INFO,
  allSEOPages,
} from '@/config/seoConfig';
export type { SEOPageConfig, SEOCategory } from '@/config/seoConfig';
