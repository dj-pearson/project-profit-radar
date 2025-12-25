/**
 * SEO Components Index
 *
 * Centralized exports for all SEO-related components.
 * Import from '@/components/seo' for clean imports.
 *
 * Usage:
 * import { ProgrammaticSEO, InternalLinking, InteractiveFAQ } from '@/components/seo';
 */

// Core SEO Components
export { PageSEO, createOrganizationSchema, createSoftwareApplicationSchema, createFAQSchema, createBreadcrumbSchema, createHowToSchema, createProductSchema, createArticleSchema, createWebPageSchema } from './PageSEO';
export type { PageSEOProps } from './PageSEO';

export { ProgrammaticSEO } from './ProgrammaticSEO';
export type { ProgrammaticSEOProps } from './ProgrammaticSEO';

export { UnifiedSEOSystem } from './UnifiedSEOSystem';
export type { UnifiedSEOProps } from './UnifiedSEOSystem';

// Internal Linking Components
export { InternalLinking, ContextualLink, RelatedArticles, BreadcrumbTrail } from './InternalLinking';
export type { InternalLinkingProps, ContextualLinkProps, RelatedArticlesProps, BreadcrumbTrailProps } from './InternalLinking';

// FAQ Components
export { InteractiveFAQ, constructionSoftwareFAQs, pricingFAQs } from './InteractiveFAQ';
export type { FAQItem } from './InteractiveFAQ';

export { GEOOptimizedFAQ } from './GEOOptimizedFAQ';

// Schema Components
export { SaaSProductSchema } from './SaaSProductSchema';
export { EnhancedSchemaMarkup, FAQSchema, OrganizationSchema, SoftwareSchema, ArticleSchema } from './EnhancedSchemaMarkup';
export { AggregateRatingSchema } from './AggregateRatingSchema';
export { LocalSEOSchema } from './LocalSEOSchema';
export { VideoSEOSchema } from './VideoSEOSchema';
export { SiteSearchSchema } from './SiteSearchSchema';
export { HowToSchema } from './HowToSchema';

// SEO Utility Components
export { QuickAnswerSnippet, LastUpdated } from './QuickAnswerSnippet';
export { SEOCompatibilityLayer } from './SEOCompatibilityLayer';
export { DynamicSEOOptimizer } from './DynamicSEOOptimizer';

// SEO Dashboard Components (Admin)
export { MCPSEODashboard } from './MCPSEODashboard';
export { MCPSetupWizard } from './MCPSetupWizard';
export { SEOAnalyticsDashboard } from './SEOAnalyticsDashboard';

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
